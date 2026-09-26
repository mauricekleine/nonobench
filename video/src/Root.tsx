import { AbsoluteFill, Composition, Folder } from "remotion";

import { Background, Grain } from "./brand/Background";
import { NonobenchV12 } from "./NonobenchV12";
import { HardMode } from "./scenes/HardMode";
import { Intro } from "./scenes/Intro";
import { Leaderboard } from "./scenes/Leaderboard";
import { Outro } from "./scenes/Outro";
import { PerfectRun } from "./scenes/PerfectRun";
import { ThePuzzle } from "./scenes/ThePuzzle";
import { TheWall } from "./scenes/TheWall";
import { WhatsNew } from "./scenes/WhatsNew";
import { FPS, SCENES, TOTAL_FRAMES } from "./timing";

// Scenes on their own, over the same room, for previewing one at a time.
const withRoom = (Scene: React.FC) => {
	const Framed: React.FC = () => (
		<AbsoluteFill>
			<Background />
			<Scene />
			<Grain />
		</AbsoluteFill>
	);
	Framed.displayName = Scene.displayName ?? Scene.name;
	return Framed;
};

const scenes = [
	{ id: "Intro", component: withRoom(Intro), frames: SCENES.intro },
	{ id: "ThePuzzle", component: withRoom(ThePuzzle), frames: SCENES.puzzle },
	{ id: "TheWall", component: withRoom(TheWall), frames: SCENES.wall },
	{ id: "PerfectRun", component: withRoom(PerfectRun), frames: SCENES.perfect },
	{ id: "Leaderboard", component: withRoom(Leaderboard), frames: SCENES.leaderboard },
	{ id: "HardMode", component: withRoom(HardMode), frames: SCENES.hard },
	{ id: "WhatsNew", component: withRoom(WhatsNew), frames: SCENES.whatsNew },
	{ id: "Outro", component: withRoom(Outro), frames: SCENES.outro },
];

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="NonobenchV12" component={NonobenchV12} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
		<Folder name="NonobenchV12-Scenes">
			{scenes.map((scene) => (
				<Composition key={scene.id} id={scene.id} component={scene.component} durationInFrames={scene.frames} fps={FPS} width={1920} height={1080} />
			))}
		</Folder>
	</>
);
