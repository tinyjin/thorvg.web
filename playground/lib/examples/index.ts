import { ShowcaseExample } from './types';
import { basicShapesExample } from './basic-shapes';
import { gradientsExample } from './gradients';
import { transformStaticExample } from './transform-static';
import { transformAnimationExample } from './transform-animation';
import { textStaticExample } from './text-static';
import { textAnimationExample } from './text-animation';
import { pictureSvgExample } from './picture-svg';
import { lottieAnimationExample } from './lottie-animation';

export * from './types';

export const showcaseExamples: ShowcaseExample[] = [
  basicShapesExample,
  gradientsExample,
  transformStaticExample,
  transformAnimationExample,
  textStaticExample,
  textAnimationExample,
  pictureSvgExample,
  lottieAnimationExample,
];

export const getExampleById = (id: string): ShowcaseExample | undefined => {
  return showcaseExamples.find(example => example.id === id);
};

export const getExamplesByCategory = (category: ShowcaseExample['category']): ShowcaseExample[] => {
  return showcaseExamples.filter(example => example.category === category);
};
