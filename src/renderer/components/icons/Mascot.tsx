import appIconImg from '../../assets/mascot/app-icon.png'
import loadingImg from '../../assets/mascot/loading.png'
import onboardingImg from '../../assets/mascot/onboarding.png'
import errorImg from '../../assets/mascot/error.png'
import successImg from '../../assets/mascot/success.png'
import emptyImg from '../../assets/mascot/empty.png'

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
