import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Map, Home, BookOpen, Mountain, Phone } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useEffect } from 'react'

type MobileBottomNavProps = {
  visible?: boolean
}

const NAV_HEIGHT = 56

const MobileBottomNav = ({ visible = false }: MobileBottomNavProps) => {
  const location = useLocation()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--mobile-bottom-nav-height',
        visible ? `${NAV_HEIGHT}px` : '0px'
      )
    }
  }, [visible])

  const items = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/map', label: 'Bản đồ', icon: Map },
    { to: '/guide', label: 'Cẩm nang', icon: BookOpen },
    { to: '/climb', label: 'Leo núi', icon: Mountain },
    { to: '#footer', label: 'Liên hệ', icon: Phone, isContact: true },
  ]

  const handleClick = (item: any, e: React.MouseEvent) => {
    if (item.isContact) {
      e.preventDefault()
      const footer = document.getElementById('footer')
      if (footer) footer.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
  }

  const content = (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-[1100] md:hidden w-screen select-none transition-transform duration-300 will-change-transform",
      visible ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="w-full">
        <div
          className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-gray-200 shadow-lg"
          style={{ height: 'var(--mobile-bottom-nav-height)' }}
        >
          <ul className="grid grid-cols-5 w-full h-full">
            {items.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.to
              return (
                <li key={item.to} className="">
                  <Link
                    to={item.to}
                    onClick={(e) => handleClick(item, e)}
                    className={cn(
                      'flex flex-col items-center justify-center text-xs focus:outline-none h-[56px]',
                      'px-2',
                      active ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={cn('w-5 h-5 mb-0.5', active && 'stroke-[2.5]')} />
                    <span className="leading-none">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }
  return content
}

export default MobileBottomNav


