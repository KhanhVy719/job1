declare module "asciichart" {
  export interface AsciiChartOptions {
    height?: number;
    width?: number;
    format?: (x: number, i: number) => string;
    offset?: number;
    padding?: string;
    colors?: number[];
  }

  export function plot(series: number[] | number[][], options?: AsciiChartOptions): string;

  const asciichart: {
    plot: typeof plot;
    default: typeof plot;
  };

  export default asciichart;
}
