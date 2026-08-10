import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

export type NodeCardSection = 'system' | 'usage' | 'network' | 'quality'
export type NodeCardFieldGroup = NodeCardSection
export type NodeCardField = string

const SECTION_KEYS: readonly NodeCardSection[] = ['system', 'usage', 'network', 'quality']
const KEY_LIST_SEPARATOR = /[\s,，、]+/

const FIELD_KEYS: Record<NodeCardFieldGroup, readonly NodeCardField[]> = {
  system: ['provider', 'os', 'price', 'billing', 'cores', 'memoryTotal', 'diskTotal', 'trafficLimit', 'bandwidth', 'cpuModel', 'cpuRating', 'uptime', 'remaining', 'virtualization'],
  usage: ['cpu', 'memory', 'swap', 'disk', 'traffic'],
  network: ['uploadSpeed', 'downloadSpeed', 'uploadTotal', 'downloadTotal'],
  quality: ['telecom', 'unicom', 'mobile', 'latency', 'loss', 'history'],
}

const SECTION_PRESETS: Record<string, readonly NodeCardSection[]> = {
  full: SECTION_KEYS,
  compact: ['system', 'usage', 'quality'],
  monitor: ['system', 'usage', 'network', 'quality'],
  minimal: ['system', 'usage'],
}

const FIELD_PRESETS: Record<NodeCardFieldGroup, readonly NodeCardField[]> = {
  // virtualization 可通过 custom 字段重新启用，默认不占用卡片高度。
  system: ['provider', 'os', 'price', 'billing', 'cores', 'memoryTotal', 'diskTotal', 'trafficLimit', 'bandwidth', 'cpuModel', 'cpuRating', 'uptime', 'remaining'],
  usage: FIELD_KEYS.usage,
  network: FIELD_KEYS.network,
  quality: FIELD_KEYS.quality,
}

const FIELD_SETTING_KEYS: Record<NodeCardFieldGroup, string> = {
  system: 'nodeCardSystemFieldsV4',
  usage: 'nodeCardUsageFieldsV2',
  network: 'nodeCardNetworkFieldsV2',
  quality: 'nodeCardQualityFieldsV2',
}

function parseKeyList(value: unknown, allowed: readonly string[], fallback: readonly string[]): string[] {
  if (typeof value !== 'string')
    return [...fallback]

  const allowedSet = new Set(allowed)
  const keys = value
    .split(KEY_LIST_SEPARATOR)
    .map(key => key.trim())
    .filter((key): key is string => allowedSet.has(key))

  return keys.length > 0 ? [...new Set(keys)] : [...fallback]
}

export function useNodeCardSettings() {
  const appStore = useAppStore()

  const preset = computed(() => {
    const value = appStore.themeSettings.nodeCardPresetV2
    return typeof value === 'string' && (value === 'custom' || value in SECTION_PRESETS) ? value : 'full'
  })

  const sections = computed<NodeCardSection[]>(() => {
    if (preset.value === 'custom')
      return parseKeyList(appStore.themeSettings.nodeCardSectionsV2, SECTION_KEYS, SECTION_KEYS) as NodeCardSection[]
    return [...(SECTION_PRESETS[preset.value] ?? SECTION_KEYS)]
  })

  const fields = computed<Record<NodeCardFieldGroup, NodeCardField[]>>(() => {
    const configured = {} as Record<NodeCardFieldGroup, NodeCardField[]>
    for (const group of Object.keys(FIELD_KEYS) as NodeCardFieldGroup[]) {
      configured[group] = parseKeyList(
        appStore.themeSettings[FIELD_SETTING_KEYS[group]],
        FIELD_KEYS[group],
        FIELD_PRESETS[group],
      )
    }
    return configured
  })

  function isSectionVisible(section: NodeCardSection): boolean {
    return sections.value.includes(section)
  }

  function isFieldVisible(group: NodeCardFieldGroup, field: NodeCardField): boolean {
    return fields.value[group].includes(field)
  }

  function getSectionOrder(section: NodeCardSection): number {
    const index = sections.value.indexOf(section)
    return index >= 0 ? index : SECTION_KEYS.length
  }

  const showFavorite = computed(() => appStore.themeSettings.nodeCardShowFavorite !== false)
  const showDetailAction = computed(() => appStore.themeSettings.nodeCardShowDetailAction !== false)
  const showRegionFlag = computed(() => appStore.themeSettings.nodeCardShowRegionFlag !== false)
  const showTags = computed(() => appStore.themeSettings.nodeCardShowTags !== false)
  const showOfflineMask = computed(() => appStore.themeSettings.nodeCardShowOfflineMask !== false)

  return {
    preset,
    sections,
    fields,
    isSectionVisible,
    isFieldVisible,
    getSectionOrder,
    showFavorite,
    showDetailAction,
    showRegionFlag,
    showTags,
    showOfflineMask,
  }
}
