from transformers import T5ForConditionalGeneration, T5Tokenizer
import spacy
from fastcoref import spacy_component
import re

PATH = "/Users/john/Hugging_Face_Tutorial/api/source_target_ckpt"
model = T5ForConditionalGeneration.from_pretrained(PATH)
tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-large")

def load_spacy(spacy_model="en_core_web_sm"):
    global nlp
    nlp = spacy.load(spacy_model, exclude=["lemmatizer", "ner", "textcat"])
    nlp.add_pipe("fastcoref")
    nlp.add_pipe('sentencizer')

load_spacy()


def get_final_span(syntactic_head_token, fb_head_token):
    # mention subtree vs children distinction in meeting!
    syntactic_head_subtree = list(syntactic_head_token.subtree)

    relevant_tokens = []

    for token in syntactic_head_subtree:
        if token.dep_ in ['cc', 'conj'] and token.i > fb_head_token.i:
            break
        relevant_tokens.append(token)

    left_edge = relevant_tokens[0].idx
    right_edge = relevant_tokens[-1].idx + len(relevant_tokens[-1].text)

    return left_edge, right_edge


def get_head_span(head_token_offset_start, head_token_offset_end, doc):
    fb_head_token = doc.char_span(head_token_offset_start, head_token_offset_end,
                                  alignment_mode='expand')[0]

    # when above target, eliminate CC or CONJ arcs
    # if on non-FB-target verb mid-traversal, DO take CC or CONJ arcs
    # if hit AUX, don't take CC or CONJ - don't worry for now
    if fb_head_token.dep_ == 'ROOT':
        syntactic_head_token = fb_head_token
    else:
        syntactic_head_token = None
        ancestors = list(fb_head_token.ancestors)
        ancestors.insert(0, fb_head_token)

        if len(ancestors) == 1:
            syntactic_head_token = ancestors[0]
        else:
            for token in ancestors:
                if token.pos_ in ['PRON', 'PROPN', 'NOUN']:
                    syntactic_head_token = token
                    break
                elif token.pos_ in ['VERB', 'AUX']:
                    syntactic_head_token = token
                    break

            if syntactic_head_token is None:
                for token in ancestors:
                    if token.pos_ == 'NUM':
                        syntactic_head_token = token
                        break

    # postprocessing for CC and CONJ -- exclude child arcs with CC or CONJ
    span_start, span_end = get_final_span(syntactic_head_token, fb_head_token)

    return span_start, span_end


def get_span_indices(word, text):
    try:
        return re.search(word, text, flags=re.IGNORECASE).span()
    except:
        return False


def get_text_span(target, text):

    doc = nlp(text)

    span_ixs = get_span_indices(target, text)

    try:
        s, e = get_head_span(*span_ixs, doc)
        span = text[s:e]
        return span
    except:
        return False


class OrderedSet:
    def __init__(self, iterable=None):
        self._dict = {}
        if iterable:
            for item in iterable:
                self.add(item)

    def add(self, item):
        self._dict[item] = None

    def discard(self, item):
        self._dict.pop(item, None)

    def __contains__(self, item):
        return item in self._dict

    def __iter__(self):
        return iter(self._dict)

    def __len__(self):
        return len(self._dict)

    def __repr__(self):
        return f"{self.__class__.__name__}({list(self._dict.keys())})"


def extract_parentheses_content(s):
    stack = []
    contents = []
    start = 0

    for i, char in enumerate(s):
        if char == '(':
            if not stack:
                start = i + 1
            stack.append(i)
        elif char == ')':
            if stack:
                stack.pop()
                if not stack:
                    contents.append(s[start:i])
    return contents



def tree2triplet(tree):
    triplets = []
    contents = extract_parentheses_content(tree)

    for values in contents:
        if 'nest' not in values:
            values = values.split(' ')
            triplets.append(
                ('AUTHOR', values[0], values[-1])
            )
        else:
            top_source = values[:values.find("nest") - 1]
            values = values[values.find("nest") + len("nest"):]
            values_nest = extract_parentheses_content(values)
            for nest_v in values_nest:
                if 'nest' not in nest_v:
                    nest_v = nest_v.split(' ')
                    relation = nest_v[-1]
                    triplets.append(
                        (f'AUTHOR_{top_source}', nest_v[0], relation)
                    )
                else:
                    top_nest_source = nest_v[:nest_v.find("nest") - 1]
                    nest_v = nest_v[nest_v.find("nest") + len("nest"):]
                    values_nest_nest = extract_parentheses_content(nest_v)
                    for nest_v_nest in values_nest_nest:
                        nest_v_nest = nest_v_nest.split(' ')
                        # Preserving original logic for nested nests
                        triplets.append(
                            (f'AUTHOR_{top_source}_{top_nest_source}', nest_v_nest[0], nest_v_nest[-1])
                        )

    return triplets


def infer(text):
    device = 'cpu'

    processed_texts = []
    doc = nlp(text[0], component_cfg={"fastcoref": {'resolve_text': True}})
    coref = doc._.resolved_text
    coref_doc = nlp(coref)
    for sentence in coref_doc.sents:
        processed_texts.append(str(sentence))

    tokenized_inputs = tokenizer.batch_encode_plus(
        processed_texts,
        max_length=100,
        padding=True,
        truncation=True,
        return_tensors="pt"
    )

    outs = model.generate(
        input_ids=tokenized_inputs["input_ids"].to(device),
        attention_mask=tokenized_inputs["attention_mask"].to(device),
        max_length=100
    )


    all_sents = []
    for idx, out in enumerate(outs):
        dec = tokenizer.decode(out, skip_special_tokens=True)
        all_sents.append(tree2triplet(dec))

    flattened_sentences = [item for sublist in all_sents for item in sublist]
    ordered_set_sentences = OrderedSet(flattened_sentences)
    unique_sentences = list(ordered_set_sentences)
    spans_sentences = []
    for parsed in unique_sentences:
        source, target, belief = parsed
        span = get_text_span(target, ' '.join(text))
        if span:
            spans_sentences.append([source, target, belief, span,])
    return {"result": spans_sentences}
