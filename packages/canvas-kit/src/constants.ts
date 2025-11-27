/**
 * ThorVG constants and enums
 */

export enum BlendMethod {
  Normal = 0,
  Multiply = 1,
  Screen = 2,
  Overlay = 3,
  Darken = 4,
  Lighten = 5,
  ColorDodge = 6,
  ColorBurn = 7,
  HardLight = 8,
  SoftLight = 9,
  Difference = 10,
  Exclusion = 11,
}

export enum StrokeCap {
  Butt = 0,
  Round = 1,
  Square = 2,
}

export enum StrokeJoin {
  Miter = 0,
  Round = 1,
  Bevel = 2,
}

export enum FillRule {
  Winding = 0,
  EvenOdd = 1,
}

export enum GradientSpread {
  Pad = 0,
  Reflect = 1,
  Repeat = 2,
}

export enum CompositeMethod {
  None = 0,
  ClipPath = 1,
  AlphaMask = 2,
  InvAlphaMask = 3,
  LumaMask = 4,
  InvLumaMask = 5,
}

export enum TextWrapMode {
  None = 0,
  Character = 1,
  Word = 2,
  Smart = 3,
  Ellipsis = 4,
}

export type RendererType = 'sw' | 'gl' | 'wg' | 'auto';
export type StrokeCapType = 'butt' | 'round' | 'square';
export type StrokeJoinType = 'miter' | 'round' | 'bevel';
export type FillRuleType = 'winding' | 'evenodd';
export type GradientSpreadType = 'pad' | 'reflect' | 'repeat';
export type TextWrapModeType = 'none' | 'character' | 'word' | 'smart' | 'ellipsis';
