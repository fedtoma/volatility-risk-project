declare module "react-plotly.js" {
  import { Component, Ref } from "react";
  import Plotly from "plotly.js-dist";

  interface PlotParams {
    data: any[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: any[];
    style?: React.CSSProperties;
    ref?: Ref<any>; // ✅ add this

    // callbacks
    onInitialized?: (figure: any, graphDiv: any) => void;
    onUpdate?: (figure: any, graphDiv: any) => void;
    onHover?: (event: any) => void;
    onUnhover?: (event: any) => void;
    onClick?: (event: any) => void;
    onSelected?: (event: any) => void;
    onDeselect?: (event: any) => void;
    onRelayout?: (event: any) => void;
    onRestyle?: (event: any) => void;
  }

  export default class Plot extends Component<PlotParams> {}
}
