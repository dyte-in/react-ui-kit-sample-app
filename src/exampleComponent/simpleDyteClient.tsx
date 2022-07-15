import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";
import { DyteMeeting } from "@dytesdk/react-ui-kit";
import { joinExistingRoom } from "../utils";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  }
});
const defaultBackgroundImage = 'https://storage.googleapis.com/dyte-image-cdn/bgImages/bg_4.jpg';

selfieSegmentation.setOptions({
  modelSelection: 1,
});

export const SimpleDyteClient: React.FC<{}> = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string; room: string }>();
  const auth = sessionStorage.getItem("auth");
  const roomName = sessionStorage.getItem("roomName");
  const [meeting, initMeeting] = useDyteClient();

  useEffect(() => {

    if (auth && roomName && params.id) {
      initMeeting({
        authToken: auth,
        roomName,
      });
    }

    if (!auth && !roomName && params.id && params.room) {
      //creating a new participant
      joinExistingRoom(params.id, params.room)
    }
  }, []);


  useEffect(() => {
    if (meeting) {
      meeting.meta.on('disconnected', () => {
        sessionStorage.clear();
        navigate("/");
      });

      let prevResults = false;
      selfieSegmentation.initialize().then(() => {
        const cameraTrack = meeting.self.rawVideoTrack;
        const { height, width } = cameraTrack.getSettings()
        if (height == undefined || width == undefined) {
          console.log("Background removal can't commence as Height and Width of the video feed is undefined")
          return;
        }
        const cameraVideoElement = document.createElement('video');
        cameraVideoElement.width = width;
        cameraVideoElement.height = height;
        cameraVideoElement.srcObject = new MediaStream([cameraTrack]);
        console.log(cameraVideoElement)

        let backgroundImage: HTMLImageElement;
        const img = new Image();

        img.style.objectFit = "fill";
        img.src = defaultBackgroundImage;
        img.addEventListener("load", async () => {
          await img.decode()
          backgroundImage = img
          console.log("Setting Background Image", backgroundImage);
        });

        function RetroTheme() {
          console.log('Initialising RetroTheme');
          cameraVideoElement.play()
          return async (canvas: HTMLCanvasElement, canvasCtx: CanvasRenderingContext2D) => {

            selfieSegmentation.send({ image: cameraVideoElement });
            if (!prevResults && backgroundImage != undefined) {
              prevResults = true

              selfieSegmentation.onResults(results => {
                canvasCtx.save()
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

                canvasCtx.globalCompositeOperation = 'copy';
                canvasCtx.filter = 'blur(2px)';

                canvasCtx.drawImage(
                  results.segmentationMask, 0, 0, canvas.width,
                  canvas.height);

                canvasCtx.globalCompositeOperation = 'source-in';
                canvasCtx.filter = 'none';
                canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                canvasCtx.globalCompositeOperation = 'destination-atop';
                // canvasCtx.filter = 'none';
                // canvasCtx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
                canvasCtx.fillStyle = '#00FF00';
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

                // // Only overwrite missing pixels.

                canvasCtx.restore();
              });

            }
          }

        }
        // Add video middleware
        meeting.self.addVideoMiddleware(RetroTheme)
      })
    }
  }, [meeting, navigate]);

  /*
  
                // Only overwrite existing pixels.
                if (backgroundImage != undefined) {
                  // canvasCtx.globalCompositeOperation = 'destination-atop';
                  // canvasCtx.filter = 'none';
                  // canvasCtx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
                } else {
                  // console.log("Rect filled");
                }
  */
  return (
    <DyteProvider value={meeting}>
      <div style={{ height: '100vh', width: '100vw' }}>
        <DyteMeeting mode="fill" showSetupScreen={false} meeting={meeting} />
      </div>
    </DyteProvider>
  );
};
