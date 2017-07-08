import React, { Component } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import { convertToRaw } from 'draft-js';
import FileSaver from 'file-saver';
import JSZip from 'jszip';

import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import './BlogPostGenerator.css';

const _initialState = {
  title: '',
  excerpt: '',
  author: '',
  date: '',
  featuredImage: null,
  tags: [],
  uploadedImages: [],
};

class BlogPostGenerator extends Component {

  constructor(props){
    super(props);
    this.state = _initialState;
    this._onEditorStateChange = this._onEditorStateChange.bind(this);
    this._uploadImageCallBack = this._uploadImageCallBack.bind(this);
    this._handleInputChange = this._handleInputChange.bind(this);
    this._updateTags = this._updateTags.bind(this);
    this._handleFeaturedImageUpload = this._handleFeaturedImageUpload.bind(this);
    this._downloadBlogPost = this._downloadBlogPost.bind(this);
  }

  _onEditorStateChange(content) {
    this.setState({
      editorContent: content,
    });
  }

  _handleInputChange(e) {
    let state = { ...this.state };
    state[e.target.name] = e.target.value.replace(/"/g, '\\"');;
    this.setState(state);
  }

  _updateTags(e) {
    // Convert the tags to an array
    let tags = e.target.value.split(',').map((tag) => {
      if(tag.trim()) {
        return tag.trim()
      } else {
        return null;
      }
    });
    this.setState({tags: tags });
  }

  _uploadImageCallBack(file){
    // long story short, every time we upload an image, we
    // need to save it to the state so we can get it's data
    // later when creating our zip.
    //
    let uploadedImages = this.state.uploadedImages;

    const imageObject = {
      file: file,
      localSrc: URL.createObjectURL(file),
    }

    uploadedImages.push(imageObject);

    this.setState(uploadedImages: uploadedImages)
    
    // We need to return a promise with the image src
    // the img src we will use here will be what's needed
    // to preview it in the browser. This will be different than what
    // we will see in the index.md file we generate.
    return new Promise(
      (resolve, reject) => {
        resolve({ data: { link: imageObject.localSrc } });
      }
    );
  }

  _handleFeaturedImageUpload(e) {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);

    let img = new Image();
    img.src = url;
    img.onload = function() {
      if(img.width !== 1000 && img.height !== 500) {
        alert('Your image must be exactly 1000px by 500px. Please re-upload.');
      } else {
        this.setState({featuredImage: {
          file: file,
          localSrc: url,
        }}, () => {console.dir(this.state)})
      };
    }.bind(this);
  }

  _replaceLocalSrcTags(input) {
    // The src tags for images that we will use to display them in the 
    // editor is different than what the website will need later.
    for(let uploadedImage of this.state.uploadedImages) {
      input = input.replace(uploadedImage.localSrc, uploadedImage.file.name);
    }

    return input;
  }

  _getEditorContent() {

    const { editorContent } = this.state;

    // Generate the heading section of our index.md file
    let tagsHeading='';
    for (let tag of this.state.tags) {
      if(tag) {
        tagsHeading += `\n    - ${tag}`;
      }
    }
    const heading = 
`---
title: "${this.state.title}"
excerpt: "${this.state.excerpt}"
author: "${this.state.author}"
date: "${(new Date()).toISOString()}"
draft: false
layout: "post"
featuredImage: "${(this.state.featuredImage && this.state.featuredImage.file.name) || ''}"
featuredImageAlt: "${this.state.title}"
tags: ${tagsHeading}
---`;

    // complicated stuff to extract and format the data as we need it.
    return heading + '\n\n' + this._replaceLocalSrcTags(draftToHtml(convertToRaw(editorContent.getCurrentContent())));
  }

  _downloadBlogPost() {
    let alertMsg = '';

    if(!this.state.title){
      alertMsg += '- A title is required\n'
    }

    if(!this.state.excerpt){
      alertMsg += '- A description is required\n'
    }

    if(!this.state.author){
      alertMsg += '- An author is required\n'
    }

    if(!this.state.featuredImage){
      alertMsg += '- A featured image is required\n'
    }

    if(!this.state.editorContent){
      alertMsg += '- A blog post is required\n'
    }

    if(alertMsg){
      alert(alertMsg);
      return;
    }
    
    // If we don't have any errors, create a zip file

    const zip = new JSZip();
    zip.file('index.md', this._getEditorContent())

    zip.file(this.state.featuredImage.file.name, this.state.featuredImage.file)

    for(let upload of this.state.uploadedImages) {
      zip.file(upload.file.name, upload.file)
    }

    zip.generateAsync({type:"blob"}).then((content) => {
      const urlPath = this.state.title.toLowerCase().split(' ').join('-').replace(/[^0-9a-z-]/gi, '');
      FileSaver.saveAs(content, urlPath);
    });
  }

  render() {

    const { editorContent } = this.state;

    return (
      <div>
        <h1>Gatbsy Blog Post Generator</h1>
        <small>Changes will be lost if you exit your browser. If you have code snippets to add, you really don't need this tool because you know how to code... but regardless, you would need to add the code snippets afterwards</small>
        <div style={{margin: '0 auto', width: '1400px', maxWidth:'100%'}}>
          <div className="col">
            <div className="heading-inputs">
              <input type="text" name="title" placeholder="Title" onChange={this._handleInputChange} />
              <br/>
              <input type="text" name="excerpt" placeholder="Short description of your blog post"  onChange={this._handleInputChange}/>
              <br/>
              <input type="email" name="author" placeholder="Your email address"  onChange={this._handleInputChange} />
              <br/>
              <input type="text" name="tags" placeholder="Enter tags for the blog post seperated by commas"  onChange={this._updateTags} />
              <br/>
              <small>Upload an image that is 1000px by 500px to use as the blog post's featured image.</small>
              <br/>
              <br/>
              <input type="file" name="featuredImage" onChange={this._handleFeaturedImageUpload} accept="image/*" />
              <br/>
              <br/>
            </div>

            <Editor
              toolbarClassName="blog-post-generator-toolbar"
              wrapperClassName="blog-post-generator-wrapper"
              editorClassName="blog-post-generator-editor"
              onEditorStateChange={this._onEditorStateChange}
              uploadCallback={this._uploadImageCallBack}
            />
          </div>
          <div className="col">
            <textarea
              disabled
              className="blog-post-preview no-focus"
              value={editorContent && this._getEditorContent()}
            />
            <div className="download-button" onClick={this._downloadBlogPost}>Download Blog Post</div>
          </div>
        </div>
      </div>
    );
  }
}

export default BlogPostGenerator;
