'use client'

/**
 * Which community groups describe the user — women, founders, creatives,
 * researchers, and so on.
 *
 * Distinct from interests: an interest is what someone wants ("scholarships"),
 * a community is who they are. A woman founder should see a grant aimed at
 * women founders even if she only ticked "Jobs". Listings are tagged with the
 * same `community:*` ids, and the feed boosts the ones aimed at the groups
 * chosen here. Optional — none of them fitting is a real answer.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import { useLocale } from '@/lib/i18n/context'
import { labelFor, tagsInFacet } from '@/lib/taxonomy'
import { OptionGrid, StepHeader } from './step-shell'

interface Props {
  onSubmit: (data: { communities: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const CommunitiesStep = forwardRef<any, Props>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const { t, locale } = useLocale()
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(initialData?.communities) ? initialData.communities : [],
  )

  const options = useMemo(
    () => tagsInFacet('community').map((tag) => ({ value: tag.id, label: labelFor(tag.id, locale) })),
    [locale],
  )

  useEffect(() => {
    onValidityChange?.(true)
  }, [onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => onSubmit({ communities: selected }),
  }))

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div>
      <StepHeader title={t('onboarding.communitiesTitle')} description={t('onboarding.communitiesHelp')} />
      <OptionGrid options={options} selected={selected} onToggle={toggle} columns={2} />
    </div>
  )
})

CommunitiesStep.displayName = 'CommunitiesStep'

export default CommunitiesStep
