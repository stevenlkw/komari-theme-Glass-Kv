import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

export type NodeCardSection = 'identity' | 'system' | 'usage' | 'network' | 'quality'
export type NodeCardFieldGroup = Exclude<NodeCardSection, 'quality'> | 'quality'
export type NodeCardField = string

const SECTION_KEYS: readonly NodeCardSection[] = ['identity', 'system', 'usage', 'network', 'quality']
const KEY_LIST_SEPARATOR = /[\s,，、]+/

const FIELD_KEYS: Record<NodeCardFieldGroup, readonly NodeCardField[]> = {
  identity: ['provider', 'region', 'price', 'billing', 'uptime', 'remaining'],
  system: ['cores', 'arch', 'diskTotal', 'trafficLimit', 'bandwidth', 'cpuModel', 'os', 'virtualization'],
  usage: ['cpu', 'memory', 'swap', 'disk', 'traffic'],
  network: ['uploadSpeed', 'downloadSpeed', 'uploadTotal', 'downloadTotal'],
  quality: ['telecom', 'unicom', 'mobile', 'latency', 'loss', 'history'],
}

const SECTION_PRESETS: Record<string, readonly NodeCardSection[]> = {
  full: SECTION_KEYS,
  compact: ['identity', 'system', 'usage', 'quality'],
  monitor: ['identity', 'usage', 'network', 'quality'],
  minimal: ['identity', 'usage'],
}

const FIELD_PRESETS: Record<NodeCardFieldGroup, readonly NodeCardField[]> = {
  identity: FIELD_KEYS.identity,
  // virtualization 可通过 custom 字段重新启用，默认不占用卡片高度。
  system: ['cores', 'arch', 'diskTotal', 'trafficLimit', 'bandwidth', 'cpuModel', 'os'],
  usage: FIELD_KEYS.usage,
  network: FIELD_KEYS.network,
  quality: FIELD_KEYS.quality,
}

const FIELD_SETTING_KEYS: Record<NodeCardFieldGroup, string> = {
  identity: 'nodeCardIdentityFields',
  system: 'nodeCardSystemFields',
  usage: 'nodeCardUsageFields',
  network: 'nodeCardNetworkFields',
  quality: 'nodeCardQualityFields',
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
    const value = appStore.themeSettings.nodeCardPreset
    return typeof value === 'string' && (value === 'custom' || value in SECTION_PRESETS) ? value : 'full'
  })

  const sections = computed<NodeCardSection[]>(() => {
    if (preset.value === 'custom')
      return parseKeyList(appStore.themeSettings.nodeCardSections, SECTION_KEYS, SECTION_KEYS) as NodeCardSection[]
    return [...(SECTION_PRESETS[preset.value] ?? SECTION_KEYS)]
  })

  const fields = computed<Record<NodeCardFieldGroup, NodeCardField[]>>(() => {
    const configured = {} as Record<NodeCardFieldGroup, NodeCardField[]>
    for (const group of Object.keys(FIELD_KEYS) as NodeCardFieldGroup[]) {
      const rawValue = appStore.themeSettings[FIELD_SETTING_KEYS[group]]
      // kv.6 的系统字段包含 kernel；升级时自动换成新的系统与带宽字段。
      const value = group === 'system' && typeof rawValue === 'string' && rawValue.includes('kernel')
        ? `${rawValue}\nos\nbandwidth`
        : rawValue
      configured[group] = parseKeyList(
        value,
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
    showTags,
    showOfflineMask,
  }
}
