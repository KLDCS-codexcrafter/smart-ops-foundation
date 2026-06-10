/**
 * @file        ChartLibrary.tsx
 * @purpose     15-type chart library, recharts-only, driven by ReportChartConfig.
 *              Every chart is wrapped in the existing shadcn ChartContainer.
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @decisions   D-RPT-5 (single ReportChart switch · no per-card chart code)
 * @reuses      @/components/ui/chart (ChartContainer · ChartTooltip · ChartLegend)
 * @[JWT]       N/A — pure presentation over in-app data
 */
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  ScatterChart, Scatter, ZAxis,
  FunnelChart, Funnel, LabelList,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  DEFAULT_PALETTE,
  type ReportChartConfig,
  type ReportChartSeries,
} from '@/lib/report-framework/chart-config';

type Row = Record<string, unknown>;

function seriesColor(series: ReportChartSeries, palette: string[], idx: number): string {
  return series.color ?? palette[idx % palette.length];
}

function toChartConfig(rc: ReportChartConfig): ChartConfig {
  const cfg: ChartConfig = {};
  const palette = rc.palette ?? DEFAULT_PALETTE;
  rc.series.forEach((s, i) => {
    cfg[s.key] = { label: s.label, color: seriesColor(s, palette, i) };
  });
  return cfg;
}

function renderThresholds(rc: ReportChartConfig) {
  if (!rc.thresholdBands?.length) return null;
  return rc.thresholdBands.map((t, i) => (
    <ReferenceLine
      key={`th-${i}-${t.value}`}
      y={t.value}
      stroke={t.color}
      strokeDasharray="3 3"
      label={t.label}
    />
  ));
}

export interface ReportChartProps {
  data: Row[];
  config: ReportChartConfig;
}

export function ReportChart({ data, config }: ReportChartProps) {
  const palette = config.palette ?? DEFAULT_PALETTE;
  const chartCfg = toChartConfig(config);
  const showLegend = config.legend ?? true;

  switch (config.chartType) {
    case 'column':
    case 'stacked-column': {
      const stacked = config.chartType === 'stacked-column';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-column">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {renderThresholds(config)}
            {config.series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={seriesColor(s, palette, i)}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      );
    }

    case 'bar':
    case 'stacked-bar': {
      const stacked = config.chartType === 'stacked-bar';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-bar">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey={config.xKey} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {config.series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={seriesColor(s, palette, i)}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      );
    }

    case 'line':
    case 'spline': {
      const smooth = config.chartType === 'spline';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-line">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {renderThresholds(config)}
            {config.series.map((s, i) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type={smooth ? 'monotone' : 'linear'}
                stroke={seriesColor(s, palette, i)}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      );
    }

    case 'area':
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-area">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {config.series.map((s, i) => (
              <Area
                key={s.key}
                dataKey={s.key}
                stroke={seriesColor(s, palette, i)}
                fill={seriesColor(s, palette, i)}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      );

    case 'pie':
    case 'doughnut': {
      const firstSeriesKey = config.series[0]?.key ?? 'value';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-pie">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Pie
              data={data}
              dataKey={firstSeriesKey}
              nameKey={config.xKey}
              innerRadius={config.chartType === 'doughnut' ? 50 : 0}
              outerRadius={90}
            >
              {data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={palette[i % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      );
    }

    case 'gauge': {
      const firstKey = config.series[0]?.key ?? 'value';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-gauge">
          <RadialBarChart
            innerRadius="60%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar dataKey={firstKey} fill={palette[0]} background />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadialBarChart>
        </ChartContainer>
      );
    }

    case 'bubble': {
      const sx = config.series[0];
      const sy = config.series[1] ?? config.series[0];
      const sz = config.series[2];
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-bubble">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey={sx.key} name={sx.label} />
            <YAxis type="number" dataKey={sy.key} name={sy.label} />
            {sz && <ZAxis type="number" dataKey={sz.key} range={[60, 400]} name={sz.label} />}
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Scatter data={data} fill={palette[0]} />
          </ScatterChart>
        </ChartContainer>
      );
    }

    case 'range':
      // floating-range via stacked area: low (transparent) + (high-low)
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-range">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {config.series.map((s, i) => (
              <Area
                key={s.key}
                dataKey={s.key}
                stackId="range"
                stroke={seriesColor(s, palette, i)}
                fill={seriesColor(s, palette, i)}
                fillOpacity={i === 0 ? 0 : 0.4}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      );

    case 'funnel':
    case 'pyramid': {
      const firstKey = config.series[0]?.key ?? 'value';
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-funnel">
          <FunnelChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Funnel
              data={config.chartType === 'pyramid' ? [...data].reverse() : data}
              dataKey={firstKey}
              isAnimationActive={false}
            >
              <LabelList position="right" dataKey={config.xKey} />
              {data.map((_, i) => (
                <Cell key={`fc-${i}`} fill={palette[i % palette.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ChartContainer>
      );
    }

    case 'combo':
      return (
        <ChartContainer config={chartCfg} data-testid="report-chart-combo">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {config.series.map((s, i) => {
              const color = seriesColor(s, palette, i);
              if (s.renderAs === 'line') {
                return <Line key={s.key} dataKey={s.key} type="monotone" stroke={color} dot={false} />;
              }
              if (s.renderAs === 'area') {
                return <Area key={s.key} dataKey={s.key} stroke={color} fill={color} fillOpacity={0.3} />;
              }
              return <Bar key={s.key} dataKey={s.key} fill={color} />;
            })}
          </ComposedChart>
        </ChartContainer>
      );
  }
}
