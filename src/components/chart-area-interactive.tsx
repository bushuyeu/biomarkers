"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", desktop: 140, mobile: 80 },
  { date: "2024-04-02", desktop: 130, mobile: 90 },
  { date: "2024-04-03", desktop: 140, mobile: 120 },
  { date: "2024-04-04", desktop: 140, mobile: 90 },
  { date: "2024-04-05", desktop: 135, mobile: 90 },
  { date: "2024-04-06", desktop: 135, mobile: 90 },
  { date: "2024-04-07", desktop: 135, mobile: 80 },
  { date: "2024-04-08", desktop: 135, mobile: 90 },
  { date: "2024-04-09", desktop: 130, mobile: 110 },
  { date: "2024-04-10", desktop: 135, mobile: 90 },
  { date: "2024-04-11", desktop: 135, mobile: 100 },
  { date: "2024-04-12", desktop: 140, mobile: 100 },
  { date: "2024-04-13", desktop: 140, mobile: 100 },
  { date: "2024-04-14", desktop: 145, mobile: 120 },
  { date: "2024-04-15", desktop: 140, mobile: 70 },
  { date: "2024-04-16", desktop: 138, mobile: 90 },
  { date: "2024-04-17", desktop: 135, mobile: 80 },
  { date: "2024-04-18", desktop: 130, mobile: 90 },
  { date: "2024-04-19", desktop: 135, mobile: 80 },
  { date: "2024-04-20", desktop: 130, mobile: 80 },
  { date: "2024-04-21", desktop: 125, mobile: 80 },
  { date: "2024-04-22", desktop: 125, mobile: 80 },
  { date: "2024-04-23", desktop: 123, mobile: 100 },
  { date: "2024-04-24", desktop: 120, mobile: 90 },
  { date: "2024-04-25", desktop: 120, mobile: 100 },
  { date: "2024-04-26", desktop: 115, mobile: 100 },
  { date: "2024-04-27", desktop: 115, mobile: 100 },
  { date: "2024-04-28", desktop: 125, mobile: 80 },
  { date: "2024-04-29", desktop: 115, mobile: 90 },
  { date: "2024-04-30", desktop: 115, mobile: 80 },
  { date: "2024-05-01", desktop: 115, mobile: 80 },
  { date: "2024-05-02", desktop: 125, mobile: 80 },
  { date: "2024-05-03", desktop: 115, mobile: 80 },
  { date: "2024-05-04", desktop: 115, mobile: 80 },
  { date: "2024-05-05", desktop: 125, mobile: 80 },
  { date: "2024-05-06", desktop: 115, mobile: 90 }, 
  { date: "2024-05-07", desktop: 115, mobile: 100 },
  { date: "2024-05-08", desktop: 125, mobile: 80 },
  { date: "2024-05-09", desktop: 115, mobile: 80 },
  { date: "2024-05-10", desktop: 115, mobile: 80 },
  { date: "2024-05-11", desktop: 115, mobile: 80 },
  { date: "2024-05-12", desktop: 125, mobile: 80 },
  { date: "2024-05-13", desktop: 115, mobile: 80 },
  { date: "2024-05-14", desktop: 115, mobile: 80 },
  { date: "2024-05-15", desktop: 125, mobile: 80 },
  { date: "2024-05-16", desktop: 115, mobile: 100 }, 
  { date: "2024-05-17", desktop: 115, mobile: 80 },
  { date: "2024-05-18", desktop: 115, mobile: 80 },
  { date: "2024-05-19", desktop: 125, mobile: 80 },
  { date: "2024-05-20", desktop: 115, mobile: 80 },
  { date: "2024-05-21", desktop: 115, mobile: 80 },
  { date: "2024-05-22", desktop: 125, mobile: 80 },
  { date: "2024-05-23", desktop: 115, mobile: 80 },
  { date: "2024-05-24", desktop: 115, mobile: 90 },
  { date: "2024-05-25", desktop: 115, mobile: 80 },
]

const chartConfig = {
  visitors: {
    label: "Blood Pressure",
  },
  mobile: {
    label: "Diastolic",
    color: "var(--primary)",
  },
  desktop: {
    label: "Systolic",
    color: "var(--primary)",
  },

} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Blood Pressure</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
