
export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}
