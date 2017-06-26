import React, { Component } from 'react';
import './App.css';
import BlogPostGenerator from './components/BlogPostGenerator.js'

class App extends Component {
  render() {
    return (
      <div className="App">
        <BlogPostGenerator />
      </div>
    );
  }
}

export default App;
