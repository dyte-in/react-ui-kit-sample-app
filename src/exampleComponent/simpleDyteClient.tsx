import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";
import { DyteMeeting } from "@dytesdk/react-ui-kit";
import { joinExistingRoom } from "../utils";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
}});

const background = "";

selfieSegmentation.setOptions({
  modelSelection: 1,
});

export const SimpleDyteClient: React.FC<{}> = () => {
  const navigate = useNavigate();
  const params = useParams<{ id :  string; room : string}>();
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

      let prevResults: any;

      selfieSegmentation.onResults(results => {
        console.log(results);
        prevResults = results;
      });

      selfieSegmentation.initialize().then(() => {
        function RetroTheme() {
          console.log('Initialising RetroTheme');
          return async (canvas: HTMLCanvasElement, canvasCtx: any) => {
              selfieSegmentation.send({image: canvas});
              if(prevResults !== undefined) {

                // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                canvasCtx.fillStyle = '#00FF007F';

                canvasCtx.drawImage(
                    prevResults.segmentationMask, 0, 0, canvas.width,
                    canvas.height);

              }
  
          }
          
        }
        // Add video middleware
        meeting.self.addVideoMiddleware(RetroTheme)
      })
    }
  }, [meeting, navigate]);

  return (
    <DyteProvider value={meeting}>
      <div style={{height:'100vh', width: '100vw'}}>
        <DyteMeeting mode="fill" showSetupScreen={false} meeting={meeting} />      
      </div>
    </DyteProvider>
  );
};
