import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
console.log(apiUrl);
export const events = {
  call_api: function () {
    const url = `${apiUrl}/inference`;
    const sentence = events.read_sentence();

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Sequences: sentence })
    })
    .then(response => response.json())
    .then(data => {
      let hierarchicalData = transformPOSTJson(data.result);

      plotTree(hierarchicalData);
      return data.result;
    })
    .catch((error) => {
      console.error('Error:', error);
      throw error;
    });
  },

    read_sentence: function () {
        var sentence = document.getElementById("pasted_sentence").value;
        return (sentence)
    }
};


export function transformPOSTJson(data) {
      const root = {
        name: "Root",
        children: []
      };
      // Helper function to find or create a node by path (e.g., "AUTHOR_New York Times")
      function findOrCreateNode(path) {
        const names = path.split("_");
        let currentNode = root;

        names.forEach((name, i) => {
          let nextNode = (currentNode.children || []).find(child => child.name === name);
          if (!nextNode) {
            nextNode = { name, children: [] };
            currentNode.children = currentNode.children || [];
            currentNode.children.push(nextNode);
          }
          currentNode = nextNode;
        });

        return currentNode;
      }

  data.forEach(item => {
    const [source, headWord, label, syntactic_span] = item;
    const parentNode = findOrCreateNode(source);
    const childNode = { name: headWord, belief: label, synSpan: syntactic_span, children: [] };

    parentNode.children = parentNode.children || [];
    parentNode.children.push(childNode);
  });

  return root;
}
// Parsing function sets default root as "Root". We want to start at "AUTHOR"
export function adjustHierarchy(data) {
    const authorNode = data.children.find(child => child.name === "AUTHOR");

    return authorNode || data;
}


function plotTree(data) {
    data = adjustHierarchy(data)
    const container = d3.select("#tree-container");
    container.select("svg").remove();

    const margin = {top: 20, right: 90, bottom: 30, left: 90},
        width = 500 - margin.left - margin.right,
        height = 420 - margin.top - margin.bottom;

    const treemap = d3.tree().size([height, width]).separation((a, b) => {
        return (a.parent == b.parent ? 1 : 1.5);
    });

    let nodes = d3.hierarchy(data, d => d.children);

    nodes = treemap(nodes);


    const svg = d3.select("#tree-container").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom),
        g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "5px");
    const link = g.selectAll(".link")
        .data(nodes.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return "M" + d.y + "," + d.x
                + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                + " " + d.parent.y + "," + d.parent.x;
        })
        .style("fill", "none")
        .style("stroke-width", "0.5px")
        .style("stroke", d => {
                // Color code based on belief value
                switch (d.data.belief) {
                    case 'true':
                        return "green";
                    case 'false':
                        return "red";
                    case 'unknown':
                        return "grey";
                    case 'NA':
                        return "black"
                    case 'ptrue':
                        return 'lightgreen'
                    default:
                        return "blue";
                }
            }
        );


    // adds each node as a group
    const node = g.selectAll(".node")
        .data(nodes.descendants())
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
        .style("fill", d => {
                // Color code based on belief value
                switch (d.data.belief) {
                    case 'true':
                        return "green";
                    case 'false':
                        return "red";
                    case 'unknown':
                        return "grey";
                    case 'NA':
                        return "black"
                    case 'ptrue':
                        return 'lightgreen'
                    default:
                        return "blue";
                }
            }
        );

    // adds the circle to the node
    node.append("circle")
        .attr("r", 7) // You can adjust the radius as needed
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .style("opacity", .6);
            tooltip.html(d.data.synSpan) // Assuming each node data has a 'label' property
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY + 14) + "px");
        }).on("mouseout", function (d) {
        tooltip.transition()
            .duration(1000)
            .style("opacity", 0);
    });


    // adds the text to the node
    node.append("text")
        .attr("x", d => d.children ? -13 : 13)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name);
    const legendData = [
        {label: 'True', color: 'green'},
        {label: 'False', color: 'red'},
        {label: 'Unknown', color: 'grey'},
        {label: 'Possibly True', color: 'lightgreen'},
        {label: 'Source', color: 'blue'},
    ];

    const uniqueBeliefs = new Set(nodes.descendants().map(d => d.data.belief));

    let filteredLegendData = legendData.filter(item => {
        if (item.label === 'Possibly True') {
            return uniqueBeliefs.has('ptrue');
        } else {
            return uniqueBeliefs.has(item.label.toLowerCase());
        }
    });

// Always include the 'Source' legend item
    filteredLegendData.push({label: 'Source', color: 'blue'});

    if (filteredLegendData.length > 0) {
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(x, y)'); // Replace x and y with your desired position

        const legendItem = legend.selectAll('.legend-item')
            .data(filteredLegendData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`); // Space out items

        legendItem.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .style('fill', d => d.color);

        legendItem.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(d => d.label);
    }
}