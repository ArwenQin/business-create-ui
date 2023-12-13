import { Component, Vue } from 'vue-property-decorator'
import { Getter } from 'pinia-class'
import { useStore } from '@/store/store'
import { AmlStatuses, AmlTypes } from '@/enums'
import { AmalgamatingBusinessIF } from '@/interfaces'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'

/**
 * Mixin that provides amalgamation rules, etc.
 */
@Component({})
export default class AmalgamationMixin extends Vue {
  @Getter(useStore) getAmalgamatingBusinesses!: AmalgamatingBusinessIF[]
  @Getter(useStore) isRoleStaff!: boolean
  @Getter(useStore) isTypeBcCcc!: boolean
  @Getter(useStore) isTypeBcUlcCompany!: boolean

  /** Iterable array of rule functions, sorted by importance. */
  readonly rules = [
    this.notAffiliated,
    this.notInGoodStanding,
    this.limitedRestoration,
    this.futureEffectiveFiling,
    this.foreign,
    this.foreignUlc,
    this.cccMismatch,
    this.ulcMismatch
  ]

  /** If we don't have an address, assume business is not affiliated (except for staff). */
  notAffiliated (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.LEAR && !business.address && !this.isRoleStaff) {
      return AmlStatuses.ERROR_NOT_AFFILIATED
    }
    return null
  }

  /** Disallow if NIGS (except for staff). */
  notInGoodStanding (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.LEAR && business.isNotInGoodStanding && !this.isRoleStaff) {
      return AmlStatuses.ERROR_NOT_IN_GOOD_STANDING
    }
    return null
  }

  /** Disallow if limited restoration (except for staff). */
  limitedRestoration (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.LEAR && business.isLimitedRestoration && !this.isRoleStaff) {
      return AmlStatuses.ERROR_LIMITED_RESTORATION
    }
    return null
  }

  /** Disallow if future effective filing. */
  futureEffectiveFiling (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.LEAR && business.isFutureEffective) {
      return AmlStatuses.ERROR_FUTURE_EFFECTIVE_FILING
    }
    return null
  }

  /**
   * Disallow altogether if foreign (except for staff).
   * (Could happen if staff added it and regular user resumes draft.)
   */
  foreign (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.FOREIGN && !this.isRoleStaff) {
      return AmlStatuses.ERROR_FOREIGN
    }
    return null
  }

  /** Disallow if foreign into ULC if there is also a limited. */
  foreignUlc (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.FOREIGN && this.isTypeBcUlcCompany && this.isAnyLimited) {
      return AmlStatuses.ERROR_FOREIGN
    }
    return null
  }

  /** Disallow CCC mismatch. */
  cccMismatch (business: AmalgamatingBusinessIF): AmlStatuses {
    if (business.type === AmlTypes.LEAR && business.legalType === CorpTypeCd.BC_CCC && !this.isTypeBcCcc) {
      return AmlStatuses.ERROR_CCC_MISMATCH
    }
    return null
  }

  /** Disallow ULC mismatch. */
  ulcMismatch (business: AmalgamatingBusinessIF): AmlStatuses {
    if (
      business.type === AmlTypes.LEAR &&
      business.legalType === CorpTypeCd.BC_ULC_COMPANY &&
      !this.isTypeBcUlcCompany
    ) {
      return AmlStatuses.ERROR_ULC_MISMATCH
    }
    return null
  }

  // TODO: cannot add foreign ULC if there is a BC company and ted is ULC

  // TODO: cannot add BC company if there is a foreign ULC and ted is ULC

  //
  // HELPERS
  //

  /** True if there a foreign company in the table. */
  get isAnyForeign (): boolean {
    return this.getAmalgamatingBusinesses.some(business => (business.type === AmlTypes.FOREIGN))
  }

  /** True if there a CCC in the table. */
  get isAnyCcc (): boolean {
    return this.getAmalgamatingBusinesses.some(business =>
      (business.type === AmlTypes.LEAR && business.legalType === CorpTypeCd.BC_CCC)
    )
  }

  /** True if there a limited company in the table. */
  get isAnyLimited (): boolean {
    return this.getAmalgamatingBusinesses.some(business =>
      (business.type === AmlTypes.LEAR && business.legalType === CorpTypeCd.BC_COMPANY)
    )
  }

  /** True if there is an unlimited company in the table. */
  get isAnyUnlimited (): boolean {
    return this.getAmalgamatingBusinesses.some(business =>
      (business.type === AmlTypes.LEAR && business.legalType === CorpTypeCd.BC_ULC_COMPANY)
    )
  }
}