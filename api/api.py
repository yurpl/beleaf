from flask import Flask
from flask_cors import CORS
from flask_restful import Resource, Api, reqparse
from inference import infer

app = Flask(__name__)
CORS(app)
api = Api(app=app)

parser = reqparse.RequestParser()
parser.add_argument(name="Sequences", type=str, action="append", help="The sequence to be classified", required=True)

class Inference(Resource):
    def post(self):
        args = parser.parse_args()
        sequence = args["Sequences"]
        prediction = infer(sequence)
        return prediction, 200


api.add_resource(Inference, "/inference")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
