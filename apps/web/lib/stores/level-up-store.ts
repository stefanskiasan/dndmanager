import { create } from 'zustand'
import type { LevelUpGains, LevelUpFeatSlot, AbilityId } from '@dndmanager/pf2e-engine'
import type { FeatRecommendation } from '@dndmanager/ai-services'

type WizardStep = 'hp' | 'ability-boosts' | 'skill-increases' | 'feats' | 'spells' | 'review'

interface LevelUpState {
  // Wizard navigation
  currentStep: WizardStep
  characterId: string | null
  gains: LevelUpGains | null

  // Selections
  selectedAbilityBoosts: AbilityId[]
  selectedSkillIncreases: string[]
  selectedFeats: Record<string, string>  // slot key -> feat name
  selectedSpells: string[]

  // AI suggestions
  featRecommendations: FeatRecommendation[]
  isLoadingRecommendations: boolean

  // Actions
  setCharacter: (characterId: string, gains: LevelUpGains) => void
  setStep: (step: WizardStep) => void
  addAbilityBoost: (ability: AbilityId) => void
  removeAbilityBoost: (ability: AbilityId) => void
  addSkillIncrease: (skill: string) => void
  removeSkillIncrease: (skill: string) => void
  selectFeat: (slotKey: string, featName: string) => void
  addSpell: (spellId: string) => void
  removeSpell: (spellId: string) => void
  setFeatRecommendations: (recs: FeatRecommendation[]) => void
  setLoadingRecommendations: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 'hp' as WizardStep,
  characterId: null as string | null,
  gains: null as LevelUpGains | null,
  selectedAbilityBoosts: [] as AbilityId[],
  selectedSkillIncreases: [] as string[],
  selectedFeats: {} as Record<string, string>,
  selectedSpells: [] as string[],
  featRecommendations: [] as FeatRecommendation[],
  isLoadingRecommendations: false,
}

export const useLevelUpStore = create<LevelUpState>((set) => ({
  ...initialState,

  setCharacter: (characterId, gains) =>
    set({ characterId, gains, currentStep: 'hp' }),

  setStep: (step) => set({ currentStep: step }),

  addAbilityBoost: (ability) =>
    set((s) => ({
      selectedAbilityBoosts: [...s.selectedAbilityBoosts, ability],
    })),

  removeAbilityBoost: (ability) =>
    set((s) => ({
      selectedAbilityBoosts: s.selectedAbilityBoosts.filter((a) => a !== ability),
    })),

  addSkillIncrease: (skill) =>
    set((s) => ({
      selectedSkillIncreases: [...s.selectedSkillIncreases, skill],
    })),

  removeSkillIncrease: (skill) =>
    set((s) => ({
      selectedSkillIncreases: s.selectedSkillIncreases.filter((sk) => sk !== skill),
    })),

  selectFeat: (slotKey, featName) =>
    set((s) => ({
      selectedFeats: { ...s.selectedFeats, [slotKey]: featName },
    })),

  addSpell: (spellId) =>
    set((s) => ({ selectedSpells: [...s.selectedSpells, spellId] })),

  removeSpell: (spellId) =>
    set((s) => ({
      selectedSpells: s.selectedSpells.filter((id) => id !== spellId),
    })),

  setFeatRecommendations: (recs) => set({ featRecommendations: recs }),
  setLoadingRecommendations: (loading) => set({ isLoadingRecommendations: loading }),

  reset: () => set(initialState),
}))
