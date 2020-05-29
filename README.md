# Mobile Video Page

![Deploy to Github Pages](https://github.com/tkottke90/mobile-video.github.io/workflows/Deploy%20to%20Github%20Pages/badge.svg)

Project provides examples of the webs ability to access the camera/video on a mobile device and collect media.  Additionally OCR has been added to the `live` page allowing users to process images with text.  This is returned as a separate item in the collection.


### Data

Currently the photos/data is not stored beyond the lifetime of the tab.  This is just a proof of concept.

### Installation

To get started, clone or fork the repository to your local machine.

Then run `npm install` to install the depenencies

To run this locally you will need to update the `base` href in the head element to be `/` in the `index.html` document.  

To run the application locally open 2 terminals:

- In the first one run:
```
npm run watch
```

- In the second one run:
```
npm run start:dev
```