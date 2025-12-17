import { ShowcaseExample } from './types';

export const lottieAnimationExample: ShowcaseExample = {
  id: 'lottie-animation',
  title: 'Lottie Animation',
  description: 'Load and play Lottie animations with playback controls',
  category: 'animation',
  code: `import { init } from '@thorvg/canvas-kit';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/canvas-kit/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
  renderer: 'gl'
});

// Example: Create a simple animated shape as placeholder
// In a real app, you would fetch and load a Lottie JSON file

// Fetch a Lottie animation file
// const response = await fetch('/path/to/animation.json');
// const lottieData = await response.arrayBuffer();
// const lottieBytes = new Uint8Array(lottieData);

// Create and load the animation
// const animation = new TVG.Animation();
// animation.load(lottieBytes);

// Get animation info
// const info = animation.info();
// console.log('Animation info:', {
//   totalFrames: info.totalFrames,
//   duration: info.duration,
//   fps: info.fps
// });

// Get the picture and position it
// const picture = animation.picture;
// const size = picture.size();
// const scale = Math.min(500 / size.width, 500 / size.height);

// picture.size(size.width * scale, size.height * scale);
// picture.translate(
//   (600 - size.width * scale) / 2,
//   (600 - size.height * scale) / 2
// );

// canvas.add(picture);

// Play animation
// animation.play((frame) => {
//   canvas.update();
//   canvas.render();
// });

// For now, show a placeholder
const placeholder = new TVG.Shape();
placeholder.appendRect(150, 250, 300, 100, { rx: 10, ry: 10 });
placeholder.fill(100, 100, 100, 255);

const text = new TVG.Text();
text.font('default')
  .text('Lottie Animation Example')
  .fontSize(20)
  .fill(255, 255, 255)
  .align({ horizontal: 'center', vertical: 'middle' })
  .translate(300, 300);

canvas.add(placeholder, text);
canvas.render();

console.log('To use Lottie: fetch a .json file, create TVG.Animation(), and call animation.load()');
`
};
