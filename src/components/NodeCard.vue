<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { CardX } from '@/components/ui/card-x'
import { DataTooltip } from '@/components/ui/data-tooltip'
import { useNodePingDisplay } from '@/composables/useNodePingDisplay'
import { useNodeProviderMetadata } from '@/composables/useNodeProviderMetadata'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, formatDateTime, getUptimeDays } from '@/utils/helper'
import { getDiskPercentage, getMemoryPercentage, getTrafficUsed, getTrafficUsedPercentage, hasTrafficLimit } from '@/utils/nodeMetricsHelper'
import { getOSImage, getOSName } from '@/utils/osImageHelper'
import { getRegionCode, getRegionDisplayName } from '@/utils/regionHelper'
import { formatPrice, getBillingCycleText, getDaysUntilExpired, getExpireStatus, isFreePrice, parseTags } from '@/utils/tagHelper'

const props = withDefaults(defineProps<{
  node: NodeData
  reduceMotion?: boolean
  pingEnabled?: boolean
}>(), {
  reduceMotion: false,
  pingEnabled: true,
})
const emit = defineEmits<{
  click: []
  pingClick: []
}>()
const appStore = useAppStore()
const { getNodeProviderMetadata } = useNodeProviderMetadata({
  nodes: () => [props.node],
  customAliases: () => appStore.providerAliases,
  enabled: () => appStore.nodeCardSize !== 'mini',
  allowGeoLookup: () => appStore.privateFeaturesAllowed,
  geoPermission: 'providerGeoLookup',
})
const isFavorite = computed(() => appStore.isFavoriteNode(props.node.uuid))

function toggleFavorite(): void {
  appStore.toggleFavoriteNode(props.node.uuid)
}

function handleKeyboardOpen(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ')
    return
  event.preventDefault()
  emit('click')
}

interface ResourceMetric {
  key: string
  label: string
  icon: string
  percentage: number
  display: string
  iconClass: string
  fillClass: string
  title: string
}

const NODE_METRIC_ICONS = {
  cpu: 'tabler:cpu',
  memory: 'icon-park-outline:memory',
  swap: 'tabler:arrows-exchange',
  disk: 'tabler:server-2',
  traffic: 'tabler:arrows-transfer-up-down',
} as const

const METADATA_TAG_PATTERN = /^(?:带宽|bandwidth|电信|telecom|ctcc|联通|unicom|cucc|移动|mobile|cmcc)\s*[:：=]/i
const BANDWIDTH_TAG_PATTERN = /^(?:带宽|bandwidth)[ \t]*[:：=][ \t]*([^ \t].*)$/i
const NETWORK_TAG_PATTERNS = {
  telecom: /^(?:电信|telecom|ctcc)[ \t]*[:：=][ \t]*([^ \t].*)$/i,
  unicom: /^(?:联通|unicom|cucc)[ \t]*[:：=][ \t]*([^ \t].*)$/i,
  mobile: /^(?:移动|mobile|cmcc)[ \t]*[:：=][ \t]*([^ \t].*)$/i,
} as const

const isMiniNodeCard = computed(() => appStore.nodeCardSize === 'mini')
const nodeCardXSize = computed(() => appStore.nodeCardSize === 'large' ? 'large' : 'medium')
const nodeCardContentClass = computed(() => appStore.nodeCardSize === 'large' ? 'gap-4' : isMiniNodeCard.value ? 'gap-2.5' : 'gap-3.5')
const nodeCardContentPaddingClass = computed(() => isMiniNodeCard.value ? 'pb-2' : '')
const nodeCardPanelClass = computed(() => appStore.nodeCardSize === 'large' ? 'h-14' : appStore.nodeCardSize === 'comfortable' ? 'h-12' : isMiniNodeCard.value ? 'h-7' : 'h-11')
const nodeCardPingPanelClass = computed(() => isMiniNodeCard.value ? 'gap-1 p-1' : 'gap-1.5 p-2')

const formatBytes = (bytes: number) => formatBytesWithConfig(bytes, appStore.byteDecimals)
const formatBytesPerSecond = (bytes: number) => formatBytesPerSecondWithConfig(bytes, appStore.byteDecimals)
const offlineTime = computed(() => formatDateTime(props.node.time))

const memPercentage = computed(() => getMemoryPercentage(props.node))
const swapPercentage = computed(() => {
  const total = Math.max(0, props.node.swap_total ?? 0)
  return total > 0 ? Math.max(0, props.node.swap ?? 0) / total * 100 : 0
})
const swapTooltip = computed(() => {
  const used = formatBytes(Math.max(0, props.node.swap ?? 0))
  const total = Math.max(0, props.node.swap_total ?? 0)
  return total > 0 ? `Swap 已用 ${used} / 总计 ${formatBytes(total)}` : `Swap 已用 ${used}`
})
const diskPercentage = computed(() => getDiskPercentage(props.node))

const {
  networkRows,
  latencyRenderBars,
  lossRenderBars,
  latencyDisplay,
  lossDisplay,
  latencyPanelTooltip,
  lossPanelTooltip,
} = useNodePingDisplay(() => props.node.uuid, { enabled: () => props.pingEnabled })

const trafficUsedPercentage = computed(() => getTrafficUsedPercentage(props.node))
const trafficUsed = computed(() => getTrafficUsed(props.node))
const nodeMessage = computed(() => props.node.message?.trim() ?? '')
const nodeMessageTooltip = computed(() => {
  const message = nodeMessage.value
  if (!message)
    return ''
  const updatedAt = props.node.status_updated_at ? `\n更新时间：${formatDateTime(props.node.status_updated_at)}` : ''
  return `${message}${updatedAt}`
})

// 未登录且开启「未登录隐藏价格」时不显示价格，运行与到期信息仍展示。
const showPrice = computed(() => appStore.privateFeaturesAllowed || !appStore.hidePriceWhenLoggedOut)

const uptimeDaysText = computed(() => {
  const days = getUptimeDays(props.node.uptime)
  return appStore.lang === 'zh-CN' ? `运行 ${days} 天` : `${days} days running`
})

const priceAmountText = computed(() => {
  const node = props.node
  if (node.price === 0 || !showPrice.value)
    return ''
  return formatPrice(node.price, node.currency, appStore.lang)
})

const billingText = computed(() => {
  const node = props.node
  if (!priceAmountText.value || isFreePrice(node.price))
    return ''
  const cycle = getBillingCycleText(node.billing_cycle, appStore.lang)
  if (appStore.lang !== 'zh-CN' || cycle === '一次性')
    return cycle
  return `${cycle}付`
})

const remainingInfo = computed(() => {
  const node = props.node
  const lang = appStore.lang
  const days = getDaysUntilExpired(node.expired_at)
  const status = getExpireStatus(node.expired_at)
  if (status === 'expired')
    return { text: lang === 'zh-CN' ? '已过期' : 'Expired', danger: true }
  if (status === 'long_term')
    return { text: lang === 'zh-CN' ? '长期' : 'Long-term', danger: false }
  if (status === 'unknown')
    return { text: lang === 'zh-CN' ? '剩余 -' : 'Left -', danger: false }
  return {
    text: lang === 'zh-CN' ? `剩余 ${days} 天` : `${days} days left`,
    danger: days < 10,
  }
})

const parsedTags = computed(() => parseTags(props.node.tags))

function getMetadataTagValue(pattern: RegExp): string {
  for (const tag of parsedTags.value) {
    const match = tag.text.match(pattern)
    if (match?.[1])
      return match[1].trim()
  }
  return ''
}

const bandwidthText = computed(() => getMetadataTagValue(BANDWIDTH_TAG_PATTERN) || '-')
const providerInfo = computed(() => getNodeProviderMetadata(props.node)?.provider)
const providerText = computed(() => {
  const groupText = props.node.groups.join(' · ')
  return [providerInfo.value?.displayName, groupText].filter(Boolean).join(' · ') || '未标注服务商'
})
const providerTooltip = computed(() => [...(providerInfo.value?.tooltipLines ?? []), props.node.groups.join(' · ')].filter(Boolean).join('\n') || providerText.value)
const trafficLimitText = computed(() => hasTrafficLimit(props.node) ? formatBytes(props.node.traffic_limit) : '∞')

function getMetricFillClass(baseClass: string, percentage: number): string {
  if (percentage >= 90)
    return 'metric-fill--danger'
  if (percentage >= 75)
    return 'metric-fill--warning'
  return baseClass
}

const resourceMetrics = computed<ResourceMetric[]>(() => [
  {
    key: 'cpu',
    label: 'CPU',
    icon: NODE_METRIC_ICONS.cpu,
    percentage: Math.max(0, props.node.cpu ?? 0),
    display: `${(props.node.cpu ?? 0).toFixed(1)}%`,
    iconClass: 'text-sky-500',
    fillClass: getMetricFillClass('metric-fill--cpu', props.node.cpu ?? 0),
    title: [props.node.cpu_name, `负载 ${(props.node.load ?? 0).toFixed(2)} / ${(props.node.load5 ?? 0).toFixed(2)} / ${(props.node.load15 ?? 0).toFixed(2)}`].filter(Boolean).join('\n'),
  },
  {
    key: 'memory',
    label: '内存',
    icon: NODE_METRIC_ICONS.memory,
    percentage: memPercentage.value,
    display: `${memPercentage.value.toFixed(1)}%`,
    iconClass: 'text-emerald-500',
    fillClass: getMetricFillClass('metric-fill--memory', memPercentage.value),
    title: `${formatBytes(props.node.ram ?? 0)} / ${formatBytes(props.node.mem_total ?? 0)}`,
  },
  {
    key: 'swap',
    label: 'Swap',
    icon: NODE_METRIC_ICONS.swap,
    percentage: swapPercentage.value,
    display: props.node.swap_total > 0 ? `${swapPercentage.value.toFixed(1)}%` : '-',
    iconClass: 'text-amber-500',
    fillClass: getMetricFillClass('metric-fill--swap', swapPercentage.value),
    title: swapTooltip.value,
  },
  {
    key: 'disk',
    label: '硬盘',
    icon: NODE_METRIC_ICONS.disk,
    percentage: diskPercentage.value,
    display: `${diskPercentage.value.toFixed(1)}%`,
    iconClass: 'text-orange-500',
    fillClass: getMetricFillClass('metric-fill--disk', diskPercentage.value),
    title: `${formatBytes(props.node.disk ?? 0)} / ${formatBytes(props.node.disk_total ?? 0)}`,
  },
  {
    key: 'traffic',
    label: '流量',
    icon: NODE_METRIC_ICONS.traffic,
    percentage: trafficUsedPercentage.value,
    display: hasTrafficLimit(props.node) ? `${trafficUsedPercentage.value.toFixed(1)}%` : '∞',
    iconClass: 'text-violet-500',
    fillClass: getMetricFillClass('metric-fill--traffic', trafficUsedPercentage.value),
    title: `${formatBytes(trafficUsed.value)} / ${trafficLimitText.value}`,
  },
])

function networkQualityLevel(latencyDisplay: string, lossDisplay: string, available: boolean): number {
  if (!available)
    return 0
  const latency = Number.parseFloat(latencyDisplay)
  const loss = Number.parseFloat(lossDisplay)
  const latencyGrade = latency <= 60 ? 0 : latency <= 100 ? 1 : latency <= 160 ? 2 : latency <= 200 ? 3 : 4
  const lossGrade = loss <= 1 ? 0 : loss <= 3 ? 1 : loss <= 6 ? 2 : loss <= 9 ? 3 : 4
  return 5 - Math.max(latencyGrade, lossGrade)
}

const displayNetworkRows = computed(() => networkRows.value.map(row => ({
  ...row,
  route: getMetadataTagValue(NETWORK_TAG_PATTERNS[row.key]),
  qualityLevel: networkQualityLevel(row.latencyDisplay, row.lossDisplay, row.available),
})))

const customTags = computed(() => parsedTags.value.filter(tag => !METADATA_TAG_PATTERN.test(tag.text)).map(tag => tag.text))

function getRegionAltText(region: string): string {
  return getRegionDisplayName(region) || getRegionCode(region)
}

function hasRegion(region: string | null | undefined): boolean {
  return Boolean(region?.trim())
}
</script>

<template>
  <CardX
    hoverable
    :size="nodeCardXSize"
    :content-class="nodeCardContentPaddingClass"
    class="node-card w-full cursor-pointer border-none shadow-[0_0_0_3px] shadow-transparent transition-all duration-200 rounded-xl"
    :class="[!props.node.online && '!shadow-destructive/30']"
    role="button"
    tabindex="0"
    :aria-label="`查看节点 ${props.node.name} 详情`"
    @click="emit('click')"
    @keydown="handleKeyboardOpen"
  >
    <!-- 头部：在线点 + 名称 -->
    <template #header>
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative size-2.5 shrink-0">
          <span
            class="size-2.5 rounded-full block"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
          <span
            v-if="!props.reduceMotion"
            class="animate-ping absolute inset-0 rounded-full opacity-60"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
        </div>
        <img
          v-if="hasRegion(props.node.region)"
          :src="`/images/flags/${getRegionCode(props.node.region)}.svg`"
          :alt="getRegionAltText(props.node.region)"
          class="size-5 shrink-0 rounded-sm"
        >
        <span class="text-sm font-bold flex-1 min-w-0 truncate">{{ props.node.name }}</span>
        <DataTooltip
          v-if="nodeMessage"
          :content="nodeMessageTooltip"
          placement="top"
          as="span"
          class="inline-flex shrink-0 text-amber-500"
          content-class="w-56 whitespace-pre-line leading-snug text-left"
        >
          <Icon icon="tabler:alert-triangle-filled" width="14" height="14" aria-label="节点消息" />
        </DataTooltip>
      </div>
    </template>

    <!-- 头部右侧：收藏与详情 -->
    <template #header-extra>
      <div class="flex gap-1.5 items-center shrink-0">
        <button
          type="button"
          class="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-slate-500/10 hover:text-amber-500"
          :class="isFavorite && 'text-amber-500'"
          :aria-label="isFavorite ? `取消收藏 ${props.node.name}` : `收藏 ${props.node.name}`"
          :title="isFavorite ? '取消收藏' : '收藏节点'"
          @click.stop="toggleFavorite"
          @keydown.stop
        >
          <Icon :icon="isFavorite ? 'tabler:star-filled' : 'tabler:star'" width="14" height="14" />
        </button>
        <button
          type="button"
          class="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-slate-500/10 hover:text-primary"
          :aria-label="`查看 ${props.node.name} 详情`"
          @click.stop="emit('click')"
          @keydown.stop
        >
          <Icon icon="tabler:info-circle" width="14" height="14" />
          <span class="hidden sm:inline">详情</span>
        </button>
      </div>
    </template>

    <template #default>
      <div class="flex flex-col relative" :class="nodeCardContentClass">
        <!-- 三行服务器资料，保持单向阅读顺序 -->
        <div v-if="!isMiniNodeCard" class="server-summary -mt-1 space-y-1.5 rounded-xl bg-slate-500/5 px-2.5 py-2 text-[11px] text-muted-foreground">
          <div class="summary-line" :title="providerTooltip">
            <Icon :icon="providerInfo?.primary.icon ?? 'tabler:building-skyscraper'" class="text-violet-500" />
            <span>{{ providerText }}</span>
            <span class="summary-separator">·</span>
            <img :src="getOSImage(props.node.os)" :alt="getOSName(props.node.os)" class="size-3.5 shrink-0">
            <span>{{ getOSName(props.node.os) }}</span>
            <span class="summary-separator">·</span>
            <Icon icon="tabler:box" class="text-orange-500" />
            <span>{{ props.node.virtualization || '物理机' }}</span>
            <span class="summary-separator">·</span>
            <Icon icon="tabler:gauge" class="text-cyan-500" />
            <span>带宽 {{ bandwidthText }}</span>
          </div>
          <div class="summary-line" :title="[props.node.cpu_name, props.node.kernel_version].filter(Boolean).join('\n')">
            <Icon icon="tabler:cpu" class="text-sky-500" />
            <span>{{ props.node.cpu_cores || 0 }} 核 · {{ props.node.arch || '-' }}</span>
            <span class="summary-separator">·</span>
            <Icon icon="tabler:server-2" class="text-orange-500" />
            <span>硬盘 {{ formatBytes(props.node.disk_total ?? 0) }}</span>
            <span class="summary-separator">·</span>
            <Icon icon="tabler:arrows-transfer-up-down" class="text-violet-500" />
            <span>流量 {{ trafficLimitText }}</span>
          </div>
          <div class="summary-line">
            <template v-if="priceAmountText">
              <Icon icon="tabler:currency-yen" class="text-emerald-500" />
              <span>{{ priceAmountText }}</span>
            </template>
            <template v-if="billingText">
              <span class="summary-separator">·</span>
              <Icon icon="tabler:credit-card-pay" class="text-fuchsia-500" />
              <span>{{ billingText }}</span>
            </template>
            <span v-if="priceAmountText || billingText" class="summary-separator">·</span>
            <Icon icon="tabler:clock-play" class="text-teal-500" />
            <span>{{ uptimeDaysText }}</span>
            <span class="summary-separator">·</span>
            <span
              class="inline-flex items-center gap-1 rounded-md px-1"
              :class="remainingInfo.danger ? 'bg-destructive/10 font-semibold text-destructive' : ''"
            >
              <Icon icon="tabler:hourglass" class="text-amber-500" />
              {{ remainingInfo.text }}
            </span>
          </div>
        </div>

        <!-- 资源使用：固定标签列 + 宽进度轨道 -->
        <div class="space-y-2">
          <div
            v-for="metric in resourceMetrics"
            :key="metric.key"
            class="resource-row"
            :title="metric.title"
          >
            <span class="resource-label">
              <Icon :icon="metric.icon" width="14" height="14" :class="metric.iconClass" />
              <span>{{ metric.label }}</span>
            </span>
            <div class="resource-track">
              <span
                class="resource-fill"
                :class="metric.fillClass"
                :style="{ transform: `scaleX(${Math.min(100, Math.max(0, metric.percentage)) / 100})` }"
              />
              <span class="resource-value">{{ metric.display }}</span>
            </div>
          </div>
        </div>

        <!-- 实时网速与累计流量 -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-500/5 px-2.5 py-2 text-[11px]">
          <div class="network-value text-emerald-500">
            <Icon icon="tabler:arrow-up" />
            <span class="text-muted-foreground">实时上传</span>
            <strong>{{ formatBytesPerSecond(props.node.net_out ?? 0) }}</strong>
          </div>
          <div class="network-value text-blue-500">
            <Icon icon="tabler:arrow-down" />
            <span class="text-muted-foreground">实时下载</span>
            <strong>{{ formatBytesPerSecond(props.node.net_in ?? 0) }}</strong>
          </div>
          <div class="network-value text-teal-500">
            <Icon icon="tabler:upload" />
            <span class="text-muted-foreground">累计上传</span>
            <strong>{{ formatBytes(props.node.net_total_up ?? 0) }}</strong>
          </div>
          <div class="network-value text-indigo-500">
            <Icon icon="tabler:download" />
            <span class="text-muted-foreground">累计下载</span>
            <strong>{{ formatBytes(props.node.net_total_down ?? 0) }}</strong>
          </div>
        </div>

        <!-- 三网线路质量；五格短柱使用与 Ping 相同的延迟/丢包等级 -->
        <div v-if="!isMiniNodeCard" class="space-y-1.5">
          <button
            v-for="network in displayNetworkRows"
            :key="network.key"
            type="button"
            :title="network.taskName || `${network.label}暂无 Ping 任务；线路名可通过节点标签配置`"
            class="network-quality-row"
            @click.stop="emit('pingClick')"
          >
            <div class="flex min-w-0 items-center gap-1 text-[11px] font-medium">
              <Icon icon="tabler:antenna-bars-5" width="12" height="12" :class="network.key === 'telecom' ? 'text-sky-500' : network.key === 'unicom' ? 'text-violet-500' : 'text-emerald-500'" />
              <span class="shrink-0">{{ network.label }}</span>
              <span class="truncate text-muted-foreground">{{ network.route || '-' }}</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] tabular-nums" :class="network.available ? 'text-muted-foreground' : 'text-muted-foreground/45'">
              <span class="inline-flex items-center gap-0.5"><Icon icon="tabler:clock" />{{ network.latencyDisplay }}</span>
              <span class="inline-flex items-center gap-0.5"><Icon icon="tabler:network-off" />{{ network.lossDisplay }}</span>
            </div>
            <div class="quality-bars" aria-hidden="true">
              <span
                v-for="bar in 5"
                :key="bar"
                :class="bar <= network.qualityLevel
                  ? network.key === 'telecom' ? 'bg-sky-500' : network.key === 'unicom' ? 'bg-violet-500' : 'bg-emerald-500'
                  : 'bg-slate-500/12'"
              />
            </div>
          </button>
        </div>

        <!-- 综合延迟 + 综合丢包真实历史 -->
        <div class="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardPingPanelClass, nodeCardPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :title="latencyPanelTooltip"
            :aria-label="`${props.node.name} 延迟监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="inline-flex items-center gap-1 text-muted-foreground"><Icon icon="tabler:clock" />综合延迟</span>
              <span class="font-medium">{{ latencyDisplay }}</span>
            </div>
            <div
              data-node-ping-bars="latency"
              class="grid min-h-0 min-w-0 w-full flex-1 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
              :style="{ gridTemplateColumns: `repeat(${latencyRenderBars.length}, minmax(0, 1fr))` }"
            >
              <DataTooltip
                v-for="bar in latencyRenderBars" :key="bar.key"
                placement="top" :content="bar.tooltip" class="h-full w-full"
              >
                <span
                  class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                  :class="bar.className"
                />
              </DataTooltip>
            </div>
          </button>

          <button
            type="button"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardPingPanelClass, nodeCardPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :title="lossPanelTooltip"
            :aria-label="`${props.node.name} 丢包监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="inline-flex items-center gap-1 text-muted-foreground"><Icon icon="tabler:network-off" />综合丢包</span>
              <span class="font-medium">{{ lossDisplay }}</span>
            </div>
            <div
              data-node-ping-bars="loss"
              class="grid min-h-0 min-w-0 w-full flex-1 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
              :style="{ gridTemplateColumns: `repeat(${lossRenderBars.length}, minmax(0, 1fr))` }"
            >
              <DataTooltip
                v-for="bar in lossRenderBars" :key="bar.key"
                placement="top" :content="bar.tooltip" class="h-full w-full"
              >
                <span
                  class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                  :class="bar.className"
                />
              </DataTooltip>
            </div>
          </button>
        </div>

        <!-- 自定义标签 -->
        <div v-if="customTags.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="(tag, i) in customTags" :key="i"
            variant="outline"
            class="!text-[11px] rounded-full text-muted-foreground border-muted-foreground/15 px-2 py-0"
          >
            {{ tag }}
          </Badge>
        </div>

        <!-- 离线遮罩 -->
        <div
          v-if="!props.node.online"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-white/20 dark:bg-black/20 backdrop-blur-[2px]"
        >
          <div class="text-sm font-semibold text-destructive">
            离线
          </div>
          <div class="text-[11px] text-muted-foreground mt-1">
            {{ offlineTime }}
          </div>
        </div>
      </div>
    </template>
  </CardX>
</template>

<style scoped>
.node-card {
  position: relative;
  overflow: hidden;
}

.summary-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
  white-space: nowrap;
}

.summary-line :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
  flex: 0 0 auto;
}

.summary-separator {
  color: color-mix(in srgb, currentColor 45%, transparent);
}

.resource-row {
  display: grid;
  grid-template-columns: 4.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
}

.resource-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  font-weight: 600;
}

.resource-track {
  position: relative;
  height: 1.45rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, currentColor 9%, transparent);
  border-radius: 0.45rem;
  background: color-mix(in srgb, hsl(var(--muted)) 58%, transparent);
}

.resource-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 25%);
  transform-origin: left center;
  transition: transform 360ms ease;
}

.resource-value {
  position: absolute;
  inset: 0 0.5rem 0 auto;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  color: hsl(var(--foreground));
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-shadow: 0 1px 1px hsl(var(--background) / 65%);
}

.metric-fill--cpu {
  background: linear-gradient(90deg, #38bdf8, #6366f1);
}

.metric-fill--memory {
  background: linear-gradient(90deg, #2dd4bf, #22c55e);
}

.metric-fill--swap {
  background: linear-gradient(90deg, #fbbf24, #f97316);
}

.metric-fill--disk {
  background: linear-gradient(90deg, #fb7185, #f97316);
}

.metric-fill--traffic {
  background: linear-gradient(90deg, #a78bfa, #d946ef);
}

.metric-fill--warning {
  background: linear-gradient(90deg, #fbbf24, #f97316);
}

.metric-fill--danger {
  background: linear-gradient(90deg, #fb7185, #ef4444);
}

.network-value {
  display: grid;
  min-width: 0;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.3rem;
}

.network-value :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
}

.network-value strong {
  min-width: 0;
  overflow: hidden;
  color: hsl(var(--foreground));
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.network-quality-row {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto 3.25rem;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.55rem;
  background: rgb(100 116 139 / 5%);
  padding: 0.38rem 0.5rem;
  text-align: left;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.network-quality-row:hover {
  background: rgb(100 116 139 / 10%);
  transform: translateY(-1px);
}

.network-quality-row :deep(svg) {
  width: 0.7rem;
  height: 0.7rem;
  flex: 0 0 auto;
}

.quality-bars {
  display: grid;
  height: 0.95rem;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 2px;
}

.quality-bars span {
  height: 100%;
  border-radius: 2px;
}

.quality-bars span:nth-child(1) {
  height: 35%;
}
.quality-bars span:nth-child(2) {
  height: 50%;
}
.quality-bars span:nth-child(3) {
  height: 65%;
}
.quality-bars span:nth-child(4) {
  height: 82%;
}
.quality-bars span:nth-child(5) {
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .resource-fill,
  .network-quality-row {
    transition: none;
  }
}
</style>
