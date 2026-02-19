import appIconImg from '../../assets/mascot/app-icon.webp'
import loadingImg from '../../assets/mascot/loading.webp'
import onboardingImg from '../../assets/mascot/onboarding.webp'
import errorImg from '../../assets/mascot/error.webp'
import successImg from '../../assets/mascot/success.webp'
import emptyImg from '../../assets/mascot/empty.webp'

const VARIANT_SRC: Record<MascotVariant, string> = {
  'app-icon': appIconImg,
  loading: loadingImg,
  onboarding: onboardingImg,
  error: errorImg,
  success: successImg,
  empty: emptyImg
}

type MascotVariant = 'app-icon' | 'loading' | 'onboarding' | 'error' | 'success' | 'empty'

interface MascotProps {
  variant: MascotVariant
  size?: number
  className?: string
}

export default function Mascot({ variant, size = 120, className = '' }: MascotProps) {
  return (
    <img
      src={VARIANT_SRC[variant]}
      alt={`Lumi ${variant}`}
      width={size}
      height={size}
      className={`mascot mascot--${variant} ${className}`}
      draggable={false}
    />
  )
}
