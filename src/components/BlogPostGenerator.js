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
    this._showCode = this._showCode.bind(this);
    this._hideCode = this._hideCode.bind(this);
  }

  _showCode() {
    this.setState({
      showCode: true,
    });
  }

  _hideCode() {
    this.setState({
      showCode: false,
    });
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
        }})
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

    if(this.state.excerpt && this.state.excerpt.length < 60){
      alertMsg += '- Your excerpt must be at least 60 characters\n'
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

    const { editorContent, showCode } = this.state;
    
    let toggleCode = <div className='download-button' style={{width: '200px', background: 'grey'}} onClick={this._showCode}>Show Code</div>
    let editorWidth = '100%';
    let codeDisplay = 'none';

    if(showCode) {
      editorWidth = '50%';
      codeDisplay = 'block';
      toggleCode = <div className='download-button' style={{width: '200px', background: 'grey'}} onClick={this._hideCode}>Hide Code</div>
    }


    return (
      <div>
        <h1>Gatbsy Blog Post Generator</h1>
        <small>Changes will be lost if you exit your browser.</small>
        <br/>
        <small>If you have code snippets to add, you really don't need this tool because you know how to code... but regardless, you would need to add the code snippets afterwards</small>
        <br/>
        <small>Alt tags are automatically generated from the image name. So if you want the alt tag to be 'John going for a walk' then the image you upload should be named john-going-for-a-walk.png</small>
        <div style={{margin: '0 auto', width: '1400px', maxWidth:'100%'}}>
          <div className="col" style={{width: editorWidth}}>
            <div className="heading-inputs">
              <input type="text" name="title" placeholder="Title" onChange={this._handleInputChange} />
              <br/>
              <input type="text" name="excerpt" placeholder="Short description of your blog post. It must be a complete sentence and at least 60 characters"  onChange={this._handleInputChange}/>
              <br/>
              <input type="text" name="author" placeholder="Your name (eg. John Smith)"  onChange={this._handleInputChange} />
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
              toolbar={{
                image: {
                  alt: { present: true, mandatory: false },
                }
              }}
            />
            <br/>
            <div className="download-button" onClick={this._downloadBlogPost}>Download Blog Post</div>
            <br/>
            {toggleCode}
          </div>
          <div className="col" style={{display: codeDisplay}}>
            <textarea
              disabled
              className="blog-post-preview no-focus"
              value={editorContent && this._getEditorContent()}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default BlogPostGenerator;
