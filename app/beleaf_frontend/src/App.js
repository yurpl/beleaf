import React, { useState } from 'react';
import "./App.css";
import { events, transformPOSTJson, adjustHierarchy } from "./events.js";
import { FaLeaf,FaDownload } from "react-icons/fa";
// Use apiUrl when making fetch/axios requests

function App() {
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const handleClick = () => {
      clearPlot();
    // Trigger the animation
    setAnimate(true);
    setLoading(true); // Start loading

    // Call the API
    events.call_api(apiUrl).then(response => {
      setData(adjustHierarchy(transformPOSTJson(response)));
      setLoading(false);
    }).catch(error => {
      console.error("Error fetching data: ", error);
      setLoading(false);
    });
    // Reset animation
    setTimeout(() => setAnimate(false), 500); // Duration should match the CSS animation
  };
const downloadData = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = "data.json";
    document.body.appendChild(element);
    element.click();
  };
const clearPlot = () => {
    // Assuming your D3 plot is rendered inside a div with id 'tree-container'
    const plotContainer = document.getElementById('tree-container');
    if (plotContainer) {
      plotContainer.innerHTML = ''; // Clears the content of the container
    }
  };

  return (
    <>
      <div className="App">
        <p className="title">🍃BeLeaf Visualizer</p>
        <p className="subtitle">Paste your sentence or document then press the leaf icon!</p>

        <div className="wrapper">
        <div className="item">
          <textarea id="pasted_sentence"></textarea>

        </div>
    <div className="item">
      <FaLeaf className={`icon ${animate ? 'animate-click' : ''}`} onClick={handleClick} />
              {loading && (
        <div className="loading-bar">
          <div className="loading-bar-progress" style={{ width: '100%' }}></div>
        </div>
      )}
    </div>
          <div className="item">
            <div id="tree-container"></div>
              {data && !loading && (
            <div className="item">
              <button onClick={downloadData} className="download-button">
                <FaDownload /> Download Tree JSON
              </button>
            </div>
          )}
          </div>

        </div>

      </div>
    </>
  );
}

export default App;
