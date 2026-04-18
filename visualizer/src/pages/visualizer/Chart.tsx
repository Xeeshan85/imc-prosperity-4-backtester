import { Box } from '@mantine/core';
import Highcharts from 'highcharts/highstock';
import HighchartsAccessibility from 'highcharts/modules/accessibility';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import HighchartsHighContrastDarkTheme from 'highcharts/themes/high-contrast-dark';
import HighchartsReact from 'highcharts-react-official';
import merge from 'lodash/merge';
import { ReactNode, useMemo } from 'react';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

HighchartsAccessibility(Highcharts);
HighchartsExporting(Highcharts);
HighchartsOfflineExporting(Highcharts);

function getThemeOptions(theme: (highcharts: typeof Highcharts) => void): Highcharts.Options {
  const highchartsMock = {
    _modules: {
      'Core/Globals.js': { theme: null },
      'Core/Defaults.js': { setOptions: () => {} },
    },
    win: { dispatchEvent: () => {} },
  };
  theme(highchartsMock as any);
  return highchartsMock._modules['Core/Globals.js'].theme! as Highcharts.Options;
}

interface ChartProps {
  title: string;
  options?: Highcharts.Options;
  series: Highcharts.SeriesOptionsType[];
  min?: number;
  max?: number;
  controls?: ReactNode;
  yAxisTitle?: string;
}

export function Chart({ title, options, series, min, max, controls, yAxisTitle }: ChartProps): ReactNode {
  const colorScheme = useActualColorScheme();

  const fullOptions = useMemo((): Highcharts.Options => {
    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);

    const chartOptions: Highcharts.Options = {
      chart: {
        animation: false,
        height: 400,
        zooming: { type: 'x' },
        panning: { enabled: true, type: 'x' },
        panKey: 'shift',
        numberFormatter: formatNumber,
        events: {
          load() {
            Highcharts.addEvent(this.tooltip, 'headerFormatter', (e: any) => {
              if (e.isFooter) return true;
              let timestamp = e.labelConfig.point.x;
              if (e.labelConfig.point.dataGroup) {
                const xData = e.labelConfig.series.xData;
                const lastTimestamp = xData[xData.length - 1];
                if (timestamp + 100 * e.labelConfig.point.dataGroup.length >= lastTimestamp) {
                  timestamp = lastTimestamp;
                }
              }
              e.text = `Timestamp ${formatNumber(timestamp)}<br/>`;
              return false;
            });
          },
          fullscreenOpen(this: Highcharts.Chart) {
            (this as any).tooltip.update({ outside: false });
          },
          fullscreenClose(this: Highcharts.Chart) {
            (this as any).tooltip.update({ outside: true });
          },
        },
      },
      title: { text: title },
      credits: { href: 'javascript:window.open("https://www.highcharts.com/?credits", "_blank")' },
      plotOptions: {
        series: {
          dataGrouping: {
            approximation(this: any, values: number[]): number {
              const endIndex = this.dataGroupInfo.start + this.dataGroupInfo.length;
              if (endIndex < this.xData.length) return values[0];
              return values[values.length - 1];
            },
            anchor: 'start',
            firstAnchor: 'firstPoint',
            lastAnchor: 'lastPoint',
            units: [['second', [1, 2, 5, 10]]],
          },
        },
      },
      xAxis: {
        type: 'datetime',
        title: { text: 'Timestamp' },
        crosshair: { width: 1 },
        labels: { formatter: params => formatNumber(params.value as number) },
      },
      yAxis: {
        opposite: false,
        allowDecimals: true,
        min,
        max,
        title: { text: yAxisTitle ?? null },
      },
      tooltip: { split: false, shared: true, outside: true },
      legend: { enabled: true },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      series,
      ...options,
    };

    return merge(themeOptions, chartOptions);
  }, [colorScheme, title, options, series, min, max, yAxisTitle]);

  return (
    <VisualizerCard p={0}>
      {controls && (
        <Box p="md" pb={0}>
          {controls}
        </Box>
      )}
      <HighchartsReact highcharts={Highcharts} constructorType={'stockChart'} options={fullOptions} immutable />
    </VisualizerCard>
  );
}
