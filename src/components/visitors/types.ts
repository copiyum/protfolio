export type Note = {
  id: string;
  x: number; // percent of board width 0-100
  y: number; // percent of board height 0-100
  rotation: number; // deg
  color: string; // hex color for frame/accent
  imageDataUrl?: string; // exported drawing
  name?: string;
  message?: string;
  createdAt: number; // epoch ms
};

export type BoardState = {
  notes: Note[];
};
