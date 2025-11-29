declare module 'react-native-svg-charts' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface ChartData {
    data: any[];
    svg?: any;
  }

  export interface LineChartProps {
    data: any[];
    svg?: any;
    style?: ViewStyle;
    contentInset?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    curve?: any;
    animate?: boolean;
    animationDuration?: number;
    numberOfTicks?: number;
    yAccessor?: (obj: { item: any; index: number }) => number;
    xAccessor?: (obj: { item: any; index: number }) => number;
    yMin?: number;
    yMax?: number;
    xMin?: number;
    xMax?: number;
    children?: React.ReactNode;
  }

  export class LineChart extends Component<LineChartProps> {}

  export interface AreaChartProps extends LineChartProps {
    start?: number;
  }

  export class AreaChart extends Component<AreaChartProps> {}

  export interface BarChartProps {
    data: any[];
    svg?: any;
    style?: ViewStyle;
    contentInset?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    spacingInner?: number;
    spacingOuter?: number;
    animate?: boolean;
    animationDuration?: number;
    yAccessor?: (obj: { item: any; index: number }) => number;
    xAccessor?: (obj: { item: any; index: number }) => number;
    children?: React.ReactNode;
  }

  export class BarChart extends Component<BarChartProps> {}

  export interface PieChartProps {
    data: Array<{
      value: number;
      svg?: any;
      key?: string;
    }>;
    style?: ViewStyle;
    innerRadius?: string | number;
    outerRadius?: string | number;
    labelRadius?: string | number;
    padAngle?: number;
    animate?: boolean;
    animationDuration?: number;
    valueAccessor?: (obj: { item: any; index: number }) => number;
    children?: React.ReactNode;
  }

  export class PieChart extends Component<PieChartProps> {}

  export interface ProgressCircleProps {
    progress: number;
    style?: ViewStyle;
    progressColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    animate?: boolean;
    animationDuration?: number;
  }

  export class ProgressCircle extends Component<ProgressCircleProps> {}

  export interface YAxisProps {
    data: any[];
    contentInset?: {
      top?: number;
      bottom?: number;
    };
    svg?: any;
    style?: ViewStyle;
    numberOfTicks?: number;
    formatLabel?: (value: any, index: number) => string;
    yAccessor?: (obj: { item: any; index: number }) => number;
    min?: number;
    max?: number;
  }

  export class YAxis extends Component<YAxisProps> {}

  export interface XAxisProps {
    data: any[];
    contentInset?: {
      left?: number;
      right?: number;
    };
    svg?: any;
    style?: ViewStyle;
    numberOfTicks?: number;
    formatLabel?: (value: any, index: number) => string;
    xAccessor?: (obj: { item: any; index: number }) => any;
  }

  export class XAxis extends Component<XAxisProps> {}

  export interface GridProps {
    svg?: any;
    direction?: any;
    ticks?: number[];
    belowChart?: boolean;
  }

  export class Grid extends Component<GridProps> {
    static Direction: {
      HORIZONTAL: any;
      VERTICAL: any;
      BOTH: any;
    };
  }
}
