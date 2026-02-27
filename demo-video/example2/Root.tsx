import "./index.css";
import { Composition } from "remotion";
import { MainComposition } from "./MainComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={MainComposition}
        durationInFrames={720}
        fps={5}
        width={1920}
        height={1080}
      />
    </>
  );
};
