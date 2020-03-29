import { html, render } from 'lit-html';
// import page from "//unpkg.com/page/page.mjs";

import '@material/mwc-button';
import '@material/mwc-tab-bar';

const hasVideo = !!(
  navigator.mediaDevices && 
  navigator.mediaDevices.getUserMedia
);

let videoStream;
const videoConstraints = window.constraints = {
  video: true,
  audio: false
}

const routes = [
  () => page('/'),
  () => page('/import')
];

const setTab = ($event) => {
  routes[$event.detail.index]();
}

const renderBooleanIcon = (bool) => {
  return bool ?
    html`<style>.success-icon { fill: var(--theme-success, green); } </style><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path class="success-icon" d="M21,5L9,17L3.5,11.5L4.91,10.09L9,14.17L19.59,3.59L21,5M3,21V19H21V21H3Z" /></svg>` :
    html`<style>.fail-icon { fill: var(--theme-fail, orange); } </style><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path class="fail-icon" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>` ;
}

const template = (content) => {
  return html`
<style>
  .content {
    height: calc(100vh - 48px);
    width: 100%;

    overflow: auto;

    background-color: #efefef;
  }

  .card {
    margin: 1rem;
    background-color: #fff;
    padding: 0.5rem;
    box-shadow: 0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12);
  }
</style>
<mwc-tab-bar @MDCTabBar:activated=${setTab}>
  <mwc-tab label="Live Camera"></mwc-tab>
  <mwc-tab label="Import From"></mwc-tab>
</mwc-tab-bar>

<div class="content">
  ${content}
</div>

`};

page('/import', () => {
  const content = html`
  <style>
    .import-buttons {
      display: flex;
      flex-direction: column;
      margin-top:  1rem;
    }

    .selection {
      display: grid;
      grid-template-rows: 2rem 1.5rem;
      margin: 0.5rem;
    }

    .section h4 {
      height: 100%;
      line-height: 2rem;
      margin: auto 0;
    }
  </style>
  <div class="card import">
    <h3 class="import-header">Import</h3>
    <section class="import-buttons">
      <div class="selection">
        <h4>Upload Image from Phone</h4>
        <input type="file" accept="image/*" >
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Image from Camera</h4>
        <!-- Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture -->
        <input type="file" accept="image/*" capture="environment">
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Video</h4>
        <input type="file" accept="video/*" capture="camcorder">
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
    </section>
  </div>
  `;



  render(template(content), document.body);
});

page('/', async () => {
  let content;

  if (hasVideo) {

    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.createElement('video');
    video.srcObject = videoStream;
    video.setAttribute('autoplay', '');

    const stopVideo = () => {
      video.pause();
    };

    const startVideo = () => {
      video.play();
    };

    content = html`
    <style>
      video {
        width: 100%;
      }

      .live .actions {

        margin-top: 1rem;

        display: flex;
        justify-content: flex-end;
      }

      .actions mwc-button {
        margin: 0 0.5rem;
      }
    </style>
    <div class="card live">
      ${video}
      <canvas style="display:none;"></canvas>
      <div class="actions">
        <mwc-button label="Stop" outlined @click=${stopVideo}></mwc-button>
        <mwc-button label="Play" raised @click=${startVideo}></mwc-button>
      </div>
    </div>
    `;
  } else {
    content = html`
    <style>
      .live {
        max-width: 30rem;
        margin: 1rem auto;
        display: flex;
        flex-direction: column;

        padding: 1rem;
      }

      .live h3 {
        margin: auto auto 2rem auto;
      }

      .live h4 {
        margin-bottom: 0.5rem;
      }

      .requirement {
        display: flex;
      }

      .requirement p {
        margin-left: 1rem;
        line-height: 1.5rem;
      }


      .code {
        background: lightgray;
        color: #b57500;
      }
    </style>
    <div class="card live">
      <h3>Cannot Access Media Devices!</h3>

      <h4>Requirements</h4>
      <ul>
        <li class="requirement">
          ${renderBooleanIcon( window.location.protocol === 'https' )}
          <p>Using HTTPS</p>
        </li>
        <li class="requirement">
          ${renderBooleanIcon( !!navigator.mediaDevices )}
          <p>Browser access to <span class="code">navigator.mediaDevices</span></p>
        </li>
        <!-- <li class="requirement">
          
          <p>Browser access to <span class="code">navigator.mediaDevices.getUserMedia</span></p>
        </li> -->
      </ul>
    </div>
    `;
  }

  render(template(content), document.body);
});

page('*', () => {
  const content = html`
    <h4>Oops!  This page doesn't exist</h4>
  `;

  render(template('404', content), document.body);
});

page();