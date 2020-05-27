import { html, render } from 'lit-html';
// import page from "//unpkg.com/page/page.mjs";

import '@material/mwc-button';
import '@material/mwc-tab-bar';
import '@material/mwc-icon-button';

const hasVideo = !!(
  navigator.mediaDevices && 
  navigator.mediaDevices.getUserMedia
);

// let videoStream;
let videoElement;
let animationFrame;

const videoConstraints = window.constraints = {
  video: {
    facingMode: { exact: 'environment' }
  },
  audio: false
}

const routes = [
  () => page('/'),
  () => page('/live'),
  () => page('/ocr')
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
  <mwc-tab label="Import"></mwc-tab>
  <mwc-tab label="Live Camera"></mwc-tab>
</mwc-tab-bar>

<div class="content">
  ${content}
</div>

`};

const videoTick = (canvas, video) => async () => {
  if (!video) {
    return;
  }
  
  const canvasContext = canvas.getContext('2d');

  canvas.height = video.videoHeight;
  canvas.width = video.videoWidth;

  canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

  requestAnimationFrame(videoTick(canvas, video));
}

 const files = [];

const updateFile = ($event) => {
  console.dir($event.target.files);
  const filesArray = Array.from($event.target.files);
  files.push(...filesArray);

  console.dir(files);

  const collection = document.querySelector('#collection');

  for (let file of filesArray) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const type = file.type;
      switch(type) {
        case 'image/jpeg':
          const imageElement = document.createElement('img');
          imageElement.src = e.target.result;
          collection.appendChild(imageElement);
          break;
        case 'video/mp4':
          const videoElement = document.createElement('video');
          videoElement.src = e.target.result;
          videoElement.controls = true;
          collection.appendChild(videoElement);
          break;
      }
    }
    

    reader.readAsDataURL(file);
  }
}

const scanImage = async ($event) => {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  var ctx = canvas.getContext('2d');

  ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)
  var dataURI = canvas.toDataURL('image/png');

  const image = document.createElement('img');
  const imageList = document.querySelector('.snapshots');

  image.src = dataURI;

  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  processTimer = Date.now();
  const { data: { text } } = await worker.recognize(dataURI);
  
  const endTime = Date.now();
  const timeDiff = endTime - processTimer;
  processTimer = 0;
  

  const info = document.createElement('pre');
  info.style.padding = '0.5rem';
  info.style.margin = '0.5rem';
  info.style.background = 'var(--mdc-theme-background)';
  info.style.color = '#fff';

  info.textContent = `
  OCR Text Context:
    Processing Time: ${(timeDiff / 1000)} sec

  ${text}
  `;

  console.log('=== OCR DONE ===')
  console.dir(text);
  console.log('================')

  imageList.appendChild(image);
  imageList.appendChild(info);
  return dataURI;
}

let processTimer = 0;
const worker = Tesseract.createWorker({
  workerPath: 'https://unpkg.com/tesseract.js@v2.0.0/dist/worker.min.js',
  langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  corePath: 'https://unpkg.com/tesseract.js-core@v2.0.0/tesseract-core.wasm.js',
  logger: m => {
    console.clear();
    // console.table(m);
    if (m.status !== 'recognizing text') {
      return;
    }
    
    const line = m.progress ? Math.floor(m.progress * 20) : 0;
    const space = line < 20 ? (19 - line) : 0;

    const lineBuffer = new Array(line).fill('=');
    const spaceBuffer = new Array(space).fill(' ');

    console.log('Processing Image...');
    console.log(`[${lineBuffer.join('')}${ line < 19 ? '>' : ''}${spaceBuffer.join('')}]`);

  }
});

page('/', () => {
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

    #collection {
      opacity: 0;
      transition: opacity 500ms ease-out;
    }

    #collection:not(:empty) {
      opacity: 1;
    }

    #collection img {
      width: 100%;
    }

    #collection video {
      width: 100%;
    }
  </style>
  <div class="card import">
    <h3 class="import-header">Import</h3>
    <section class="import-buttons">
      <div class="selection">
        <h4>Upload Image from Phone</h4>
        <input type="file" accept="image/*" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Image from Camera</h4>
        <!-- Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture -->
        <input type="file" accept="image/*" capture="environment" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
      <div class="selection">
        <h4>Upload Video</h4>
        <input type="file" accept="video/mp4" capture="camcorder" @change=${updateFile}>
        <!-- <mwc-button raised  label="Upload"></mwc-button> -->
      </div>
    </section>
  </div>

  <div class="card" id="collection"></div>
  `;

  render(template(content), document.body);
});

page('/live', async () => {
  let content;

  const renderWithErrors = (errorTemplates) => html`
  <style>
    .live {
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
        ${renderBooleanIcon( window.location.protocol === 'https' || window.location.hostname === 'localhost' )}
        <p>Using HTTPS (or running on Localhost)</p>
      </li>
      <li class="requirement">
        ${renderBooleanIcon( !!navigator.mediaDevices )}
        <p>Browser access to <span class="code">navigator.mediaDevices</span></p>
      </li>
      ${errorTemplates}
    </ul>
  </div>`;

  const stopRecording = () => {
    cancelAnimationFrame(animationFrame);

    if (videoElement && videoElement.srcObject) {
      for (const i of videoElement.srcObject.getTracks()) {
        i.stop();
      }
    }

    console.log('video active', videoElement.srcObject.active);

    videoElement.srcObject = null;
    // videoElement = null;
  }

  if (hasVideo) {

    let canvas;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('hidden', '');

      canvas = document.createElement('canvas');

      animationFrame = requestAnimationFrame(videoTick(canvas, videoElement));
    } catch (err) {
      console.error(err);
      const errorTemplate = html`
        <li class="requirement">
          <svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="red" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" /></svg>
          <p> Error: ${err.message}</p>
        </li>
      `;
      render(template(renderWithErrors(errorTemplate)), document.body);
      return;
    }

    const pauseVideo = () => {
      videoElement.pause();
    };

    const startVideo = async () => {
      console.dir(videoElement);

      if (videoElement.srcObject) {
        videoElement.play();
        return;
      }

      const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      videoElement = document.querySelector('video');
    

      if (!videoElement) {
        videoElement = document.createElement('video');
      }

      videoElement.srcObject = videoStream;
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('hidden', '');

      canvas = document.createElement('canvas');

      animationFrame = requestAnimationFrame(videoTick(canvas, videoElement));
    };

    const createSnap = async ($event) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      var ctx = canvas.getContext('2d');

      ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)
      var dataURI = canvas.toDataURL('image/png');

      const image = document.createElement('img');
      const imageList = document.querySelector('.snapshots');

      image.src = dataURI;

      imageList.appendChild(image);
      return dataURI;
    }

    content = html`
    <style>
      .live, .snapshots {
        max-width: 40rem;
        min-width: 200px;
        margin: 1rem auto;
      }

      @media only screen and (max-width: 40rem) {
        .live, .snapshots {
          margin: 1rem 0.5rem;
        }
      }

      video {
        width: 100%;
      }

      canvas {
        width: 100%;
      }

      .live .actions {

        margin-top: 1rem;

        display: flex;
        justify-content: flex-end;
      }

      .actions mwc-icon-button {
        color: var(--mdc-theme-primary);
      }

      .snapshots img {
        width: 100%;
        padding: 0.5rem;
      }
    </style>
    <div class="card live">
      ${videoElement}
      ${canvas}
      <div class="actions">
        <mwc-icon-button icon="format_shapes"  @click=${scanImage}></mwc-icon-button>
        <mwc-icon-button icon="add_a_photo"  @click=${createSnap}></mwc-icon-button>
        <mwc-icon-button icon="stop"  @click=${stopRecording}></mwc-icon-button>
        <mwc-icon-button icon="pause"  @click=${pauseVideo}></mwc-icon-button>
        <mwc-icon-button icon="play_arrow"  @click=${startVideo}></mwc-icon-button>
      </div>
    </div>
    <div class="card snapshots">
      <h3>Snapshots</h3>

    </div>
    `;
  } else {
   content = renderWithErrors();
  }

  render(template(content), document.body);
});

page('*', () => {
  const content = html`
    <h4>Oops!  This page doesn't exist</h4>
  `;

  // render(template('404', content), document.body);
  routes[0]();
});

page();