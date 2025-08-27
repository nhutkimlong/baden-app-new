import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet'
import { Search, MapPin, Route, Navigation, X, Globe, Phone, Mail, Facebook, ExternalLink, Clock, Map, Info } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faOm, faSearch, faLandmark, faUtensils, faBus, faParking, faBell, faClipboardList, faStickyNote, faCableCar, faPersonWalking, faRuler, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/utils/cn'
import { useMap as useMapData, useMapControls, useRouteFinding, useGeolocation } from '@/hooks/useMap'
import { 
  findPath, 
  checkOperationalStatus, 
  checkCableStationsOperational,
  checkDescentOptionsFromChuaBa,
  getPoiName, 
  getPoiDescription, 
  getUIText,
  COASTER_START_ID,
  COASTER_END_ID
} from '@/services/mapService'
import L from 'leaflet'
import { POI, OperatingHoursData } from '@/types'

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// POI Markers Component
const POIMarkers = React.memo(({ pois, currentLang, onMarkerClick }: {
  pois: any[]
  currentLang: string
  onMarkerClick: (poi: any) => void
}) => {
  return pois.map((poi) => {
    const name = getPoiName(poi, currentLang)
    const description = getPoiDescription(poi, currentLang)
    
    // Create custom icon using POI's iconurl
    const customIcon = poi.iconurl ? L.divIcon({
      html: `<img src="${poi.iconurl}" alt="${name}" style="width: 32px; height: 32px; object-fit: contain;" />`,
      className: 'custom-poi-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }) : undefined
    
    return (
      <Marker
        key={poi.id}
        position={[poi.latitude, poi.longitude]}
        icon={customIcon}
        eventHandlers={{
          click: () => onMarkerClick(poi)
        }}
      />
    )
  })
})

// Map Controls Component
const MapControls = ({ onLocate, onSearch, onTutorial, onContact, onToggleTiles, tileProvider, topOffsetPx }: {
  onLocate: () => void
  onSearch: () => void
  onTutorial: () => void
  onContact: () => void
  onToggleTiles: () => void
  tileProvider: 'google' | 'osm'
  topOffsetPx?: number
}) => {
  return (
    <div className="map-controls-container absolute right-3 md:right-4 z-[1000] flex-col gap-2 hidden md:flex" style={{ top: topOffsetPx ?? 12 }}>
      <button 
        onClick={onLocate}
        className="map-action-button" 
        title="Định vị của tôi"
      >
        <Navigation className="w-5 h-5 text-blue-600" />
      </button>
      <button 
        onClick={onSearch}
        className="map-action-button" 
        title="Tìm kiếm"
      >
        <Search className="w-5 h-5 text-purple-600" />
      </button>
      <button 
        onClick={onTutorial}
        className="map-action-button" 
        title="Xem hướng dẫn"
      >
        <MapPin className="w-5 h-5 text-yellow-500" />
      </button>
      <button 
        onClick={onToggleTiles}
        className="map-action-button" 
        title={tileProvider === 'google' ? 'Đổi sang OpenStreetMap' : 'Đổi sang Google Vệ tinh'}
      >
        <Globe className="w-5 h-5 text-green-600" />
      </button>
    </div>
  )
}

// Zoom Controls Component
const ZoomControls = () => {
  const map = useMap()

  return (
    <div className="zoom-controls-desktop hidden md:flex flex-col bg-white rounded-full shadow-md overflow-hidden z-[1001]">
      <button 
        onClick={() => map.zoomIn()}
        className="map-action-button text-gray-700 hover:bg-gray-100 p-2.5 border-b border-gray-200" 
        title="Phóng to"
      >
        <span className="text-lg">+</span>
      </button>
      <button 
        onClick={() => map.zoomOut()}
        className="map-action-button text-gray-700 hover:bg-gray-100 p-2.5" 
        title="Thu nhỏ"
      >
        <span className="text-lg">−</span>
      </button>
    </div>
  )
}

// Floating Action Buttons (Mobile)
const FloatingActionButtons = ({ onSearch, onDirections, onLocate, onTutorial }: {
  onSearch: () => void
  onDirections: () => void
  onLocate: () => void
  onTutorial: () => void
}) => {
  return (
    <div className="floating-action-buttons md:hidden absolute right-4 z-[1000] flex flex-col gap-3">
      <button
        onClick={onSearch}
        className="fab bg-white hover:bg-gray-100 text-gray-700"
        title="Tìm kiếm"
      >
        <Search className="w-5 h-5" />
      </button>
      <button 
        onClick={onDirections}
        className="fab bg-white hover:bg-gray-100 text-green-600" 
        title="Tìm đường"
      >
        <Route className="w-5 h-5" />
      </button>
      <button 
        onClick={onLocate}
        className="fab bg-blue-600 hover:bg-blue-700 text-white" 
        title="Định vị của tôi"
      >
        <Navigation className="w-5 h-5" />
      </button>
      <button 
        onClick={onTutorial}
        className="fab bg-white hover:bg-gray-100 text-yellow-500" 
        title="Hướng dẫn sử dụng"
      >
        <MapPin className="w-5 h-5" />
      </button>
    </div>
  )
}

// Tutorial Popup Component
const TutorialPopup = ({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) => {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[1050]"
        onClick={onClose}
      />
      <div className="custom-popup fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl z-[1050] w-[90vw] max-w-md max-h-[85vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2" 
          aria-label="Đóng hướng dẫn"
        >
          <X className="w-5 h-5" />
        </button>
        <h4 className="text-md sm:text-lg font-semibold mb-3 text-primary-600 text-center">
          Hướng dẫn sử dụng bản đồ
        </h4>
        <div className="tutorial-content space-y-2.5 text-xs sm:text-sm text-gray-700">
          <p className="flex items-center">
            <span className="icon-example mr-2 bg-gray-200 p-1 rounded">
              <Search className="w-4 h-4 text-primary-500" />
            </span>
            Sử dụng ô tìm kiếm để tìm địa điểm.
          </p>
          <p className="flex items-center">
            <span className="icon-example mr-2 bg-gray-200 p-1 rounded">
              <Route className="w-4 h-4 text-primary-500" />
            </span>
            Nhấn biểu tượng chỉ đường để nhập điểm và tìm lộ trình.
          </p>
          <p className="flex items-center">
            <span className="icon-example mr-2 bg-gray-200 p-1 rounded">
              <Navigation className="w-4 h-4 text-primary-500" />
            </span>
            Nhấn để xem vị trí hiện tại của bạn.
          </p>
          <p className="flex items-center">
            <span className="icon-example mr-2 bg-gray-200 p-1 rounded">
              <MapPin className="w-4 h-4 text-yellow-500" />
            </span>
            Nhấn nút "Thuyết minh" (nếu có) để nghe giới thiệu.
          </p>
        </div>
        <div className="language-switcher mt-4 pt-3 border-t border-gray-200 text-center">
          <span className="text-xs text-gray-600 mr-2">Ngôn ngữ:</span>
          <button className="lang-btn text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 bg-primary-500 text-white">
            Tiếng Việt
          </button>
          <button className="lang-btn text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 ml-1">
            English
          </button>
        </div>
      </div>
    </>
  )
}

// Contact Popup Component
const ContactPopup = ({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) => {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[1050]"
        onClick={onClose}
      />
      <div className="custom-popup fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl z-[1050] w-[90vw] max-w-md max-h-[85vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2" 
          aria-label="Đóng liên hệ"
        >
          <X className="w-5 h-5" />
        </button>
        <h4 className="text-md sm:text-lg font-semibold mb-3 text-primary-600 text-center">
          Thông tin liên hệ
        </h4>
        <div className="contact-details space-y-2 text-sm text-gray-700">
          <div className="flex items-start">
            <Mail className="text-gray-400 mt-1.5 w-5 flex-shrink-0" />
            <a 
              href="mailto:bqlnuiba@gmail.com" 
              className="ml-2 text-gray-600 hover:text-primary-500 transition duration-200"
            >
              bqlnuiba@gmail.com
            </a>
          </div>
          <div className="flex items-start">
            <Facebook className="text-gray-400 mt-1.5 w-5 flex-shrink-0" />
            <a 
              href="https://www.facebook.com/bqlkdlquocgianuibaden" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-gray-600 hover:text-primary-500 transition duration-200 flex items-center"
            >
              Fanpage Facebook
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
          <div className="flex items-start">
            <Globe className="text-gray-400 mt-1.5 w-5 flex-shrink-0" />
            <a 
              href="https://www.tiktok.com/@nuibadenbql" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-gray-600 hover:text-primary-500 transition duration-200 flex items-center"
            >
              nuibadenbql (TikTok)
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
          <div className="flex items-start">
            <Globe className="text-gray-400 mt-1.5 w-5 flex-shrink-0" />
            <a 
              href="http://khudulichnuibaden.tayninh.gov.vn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-gray-600 hover:text-primary-500 transition duration-200 flex items-center"
            >
              khudulichnuibaden.tayninh.gov.vn
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
          <div className="flex items-start">
            <Phone className="text-gray-400 mt-1.5 w-5 flex-shrink-0" />
            <a 
              href="tel:02763823378" 
              className="ml-2 text-gray-600 hover:text-primary-500 transition duration-200"
            >
              0276 3823378
            </a>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
          <a 
            href="tel:02763823378"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150"
          >
            <Phone className="w-4 h-4" />
            Gọi Hotline
          </a>
        </div>
      </div>
    </>
  )
}

// Descent Choice Popup Component
const DescentChoicePopup = ({ isOpen, onClose, onCableCar, onAlpineCoaster, descentOptions }: {
  isOpen: boolean
  onClose: () => void
  onCableCar: () => void
  onAlpineCoaster: () => void
  descentOptions?: any
}) => {
  if (!isOpen) return null

  const cableCarActive = descentOptions?.chuaHangActive || descentOptions?.hoaDongActive
  const coasterActive = descentOptions?.coasterActive

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[1050]"
        onClick={onClose}
      />
      <div className="custom-popup fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl z-[1050] w-[90vw] max-w-sm">
        <h4 className="text-md sm:text-lg font-semibold mb-3 text-primary-600 text-center">
          Chọn phương tiện xuống núi
        </h4>
        
        {/* Status information */}
        {descentOptions && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="mb-2">
              <span className="font-semibold">Trạng thái hoạt động:</span>
            </div>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${cableCarActive ? 'text-green-600' : 'text-red-600'}`}>
                <span>🚠 Cáp treo:</span>
                <span>{cableCarActive ? 'Hoạt động' : 'Không hoạt động'}</span>
              </div>
              <div className={`flex items-center gap-2 ${coasterActive ? 'text-green-600' : 'text-red-600'}`}>
                <span>🎢 Máng trượt:</span>
                <span>{coasterActive ? 'Hoạt động' : 'Không hoạt động'}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onCableCar}
            disabled={!cableCarActive}
            className={`w-full font-semibold py-2 px-4 rounded-md text-center transition duration-150 text-sm flex items-center justify-center gap-2 ${
              cableCarActive 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FontAwesomeIcon icon={faCableCar} />
            <span>Cáp treo</span>
          </button>
          <button 
            onClick={onAlpineCoaster}
            disabled={!coasterActive}
            className={`w-full font-semibold py-2 px-4 rounded-md text-center transition duration-150 text-sm flex items-center justify-center gap-2 ${
              coasterActive 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FontAwesomeIcon icon={faPersonWalking} />
            <span>Máng trượt</span>
          </button>
        </div>
      </div>
    </>
  )
}

// POI Info Panel Component
const POIInfoPanel = ({ poi, isVisible, onClose, onGetDirections, currentLang, operatingHours, expanded, setExpanded }: {
  poi: any
  isVisible: boolean
  onClose: () => void
  onGetDirections: (poi: any, direction: 'from' | 'to') => void
  currentLang: string
  operatingHours: any[]
  expanded: boolean
  setExpanded: (val: boolean) => void
}) => {
  if (!poi) return null

  const name = getPoiName(poi, currentLang)
  const description = getPoiDescription(poi, currentLang)
  const area = poi.area || 'N/A'
  const t = (key: string, ...args: any[]) => getUIText(key, currentLang, ...args)

  // Check operational status with operating hours
  const checkOperationalStatus = (poi: any) => {
    if (!poi || !['transport', 'attraction', 'food', 'amenities'].includes(poi.category)) {
      return { operational: true, message: '' }
    }

    // Check if POI has operating hours data from Netlify function
    let hoursData = null
    if (operatingHours && operatingHours.length > 0) {
      const hoursRecord = operatingHours.find(h => String(h.id) === String(poi.id))
      if (hoursRecord && hoursRecord.operating_hours) {
        try {
          hoursData = typeof hoursRecord.operating_hours === 'string' 
            ? JSON.parse(hoursRecord.operating_hours) 
            : hoursRecord.operating_hours
        } catch (e) {
          console.error('Error parsing operating_hours:', e)
          hoursData = null
        }
      }
    }

    // Fallback to POI's own operating_hours if no data from Netlify
    if (!hoursData && poi.operating_hours) {
      try {
        hoursData = typeof poi.operating_hours === 'string' 
          ? JSON.parse(poi.operating_hours) 
          : poi.operating_hours
      } catch (e) {
        console.error('Error parsing POI operating_hours:', e)
        hoursData = null
      }
    }

    if (!hoursData) {
      return { operational: true, message: '' }
    }

    const now = new Date()
    const currentDayOfWeek = now.getDay()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    let timeString = hoursData[dayKeys[currentDayOfWeek]] ?? hoursData['default'] ?? hoursData['monfri']
    
    if (timeString === undefined) {
      return { operational: false, message: t('statusNoSchedule') }
    }
    
    if (String(timeString).toLowerCase() === "closed") {
      return { operational: false, message: t('statusClosedToday') }
    }
    
    const timeParts = String(timeString).match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
    if (!timeParts) {
      return { operational: false, message: t('statusErrorFormat') }
    }
    
    const openHour = parseInt(timeParts[1])
    const openMinute = parseInt(timeParts[2])
    const closeHour = parseInt(timeParts[3])
    const closeMinute = parseInt(timeParts[4])
    
    const nowMinutes = currentHour * 60 + currentMinute
    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute
    
    if (nowMinutes < openMinutes) {
      return { 
        operational: false, 
        message: t('statusNotOpenYet', `${openHour}:${openMinute.toString().padStart(2, '0')}`) 
      }
    }
    
    if (nowMinutes >= closeMinutes) {
      return { 
        operational: false, 
        message: t('statusAlreadyClosed', `${closeHour}:${closeMinute.toString().padStart(2, '0')}`) 
      }
    }
    
    return { 
      operational: true, 
      message: t('statusOperational', `${closeHour}:${closeMinute.toString().padStart(2, '0')}`) 
    }
  }
  
  const status = checkOperationalStatus(poi)

  // Check if this is a descent route scenario (Chua Ba to Chan Nui)
  const isDescentRoute = poi.area === 'Chùa Bà' && area === 'Chân núi'

  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches
  const touchDataRef = useRef<{ startY: number, startExpanded: boolean } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchDataRef.current = { startY: e.touches[0].clientY, startExpanded: expanded }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDataRef.current) return
    const deltaY = e.changedTouches[0].clientY - touchDataRef.current.startY
    if (Math.abs(deltaY) < 20) {
      setExpanded(!expanded)
    } else if (deltaY > 30) {
      setExpanded(false)
    } else if (deltaY < -30) {
      setExpanded(true)
    }
    touchDataRef.current = null
  }

  return (
    <div 
      className={cn("poi-panel", isVisible && "visible")}
      style={isMobile ? {
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
      } : undefined}
    >
      {/* Drag handle area (mobile) */}
      {isMobile && (
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="absolute top-0 left-0 right-0 h-6 z-20"
          aria-label="Kéo để mở rộng hoặc thu gọn"
        />
      )}
      {/* Header with close button */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 z-10 rounded-lg shadow-lg transition-all"
        aria-label={t('close')}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content container with scroll */}
      <div className="relative max-h-[inherit] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {/* Image section */}
        {poi.imageurl && (
          <div className="w-full h-[200px] sm:h-[280px] bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
            <img 
              src={poi.imageurl} 
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Info content */}
        <div className="p-3 sm:p-4">
          {/* Title and basic info */}
          <h3 className="text-lg sm:text-xl font-bold mb-1 text-primary-600">{name}</h3>
          <p className="text-xs text-gray-600 mb-2">
            {t('poiInfoArea')}: {area}
          </p>

          {/* Operational status */}
          {status.message && (
            <div className={`poi-status text-xs sm:text-sm font-semibold mb-3 p-2 rounded-lg ${
              status.operational 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.operational ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{status.message}</span>
              </div>
            </div>
          )}

          

          {/* Description */}
          {description && (
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-3 sm:line-clamp-none">
                {description}
              </p>
            </div>
          )}



          {/* Contact Information */}
          {(poi.phone || poi.email || poi.website || poi.facebook) && (
            <div className="mb-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-800">Thông tin liên hệ</span>
                </div>
                <div className="space-y-1 text-xs">
                  {poi.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-700">{poi.phone}</span>
                    </div>
                  )}
                  {poi.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-700">{poi.email}</span>
                    </div>
                  )}
                  {poi.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                      <a href={poi.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                  {poi.facebook && (
                    <div className="flex items-center gap-2">
                      <Facebook className="w-3 h-3 text-gray-500" />
                      <a href={poi.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Facebook
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audio guide button */}
          {poi.audio_url && (
            <button className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 mb-3 shadow-sm tap-target">
              <Globe className="w-5 h-5" />
              {t('audioGuide')}
            </button>
          )}

          {/* Special Notes */}
          {poi.notes && (
            <div className="mb-3">
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                 <div className="flex items-center gap-2 mb-2">
                   <FontAwesomeIcon icon={faStickyNote} className="text-yellow-600 text-lg" />
                   <span className="text-sm font-semibold text-yellow-800">Lưu ý</span>
                 </div>
                <p className="text-xs text-yellow-700 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {poi.notes}
                </p>
              </div>
            </div>
          )}

          {/* Special descent route buttons for Chua Ba to Chan Nui */}
          {isDescentRoute && (
            <div className="mb-3">
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 mb-3">
                                 <div className="flex items-center gap-2 mb-2">
                   <FontAwesomeIcon icon={faCableCar} className="text-orange-600 text-lg" />
                   <span className="text-sm font-semibold text-orange-800">Chọn phương tiện xuống núi</span>
                 </div>
                <p className="text-xs text-orange-700">
                  Máng trượt hoạt động theo lịch vận hành. Cáp treo hoạt động thường xuyên.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onGetDirections({ ...poi, descentChoice: 'cable_car' }, 'to')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-xs shadow-sm tap-target"
                >
                                     <FontAwesomeIcon icon={faCableCar} className="text-lg" />
                   <span>Cáp treo</span>
                </button>
                <button
                  onClick={() => onGetDirections({ ...poi, descentChoice: 'alpine_coaster' }, 'to')}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-xs shadow-sm tap-target"
                >
                                     <FontAwesomeIcon icon={faPersonWalking} className="text-lg" />
                   <span>Máng trượt</span>
                </button>
              </div>
            </div>
          )}

          {/* Regular route action buttons */}
          {!isDescentRoute && (
            <div className="flex gap-2 text-xs sm:text-sm">
              <button
                onClick={() => onGetDirections(poi, 'from')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-sm tap-target"
              >
                <Map className="w-4 h-4" />
                {t('routeFromHere')}
              </button>
              <button
                onClick={() => onGetDirections(poi, 'to')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-sm tap-target"
              >
                <Route className="w-4 h-4" />
                {t('routeToHere')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Route Display Component
const RouteDisplay = ({ route, isVisible, onClose, currentLang, poiData, expanded, setExpanded }: {
  route: any
  isVisible: boolean
  onClose: () => void
  currentLang: string
  poiData: any[]
  expanded: boolean
  setExpanded: (val: boolean) => void
}) => {
  if (!route || !route.path) return null

  const t = (key: string, ...args: any[]) => getUIText(key, currentLang, ...args)

  // Convert route path to Leaflet coordinates
  const routeCoordinates = route.path.map((nodeId: string) => {
    const poi = poiData.find((p: any) => String(p.id) === String(nodeId))
    return poi ? [poi.latitude, poi.longitude] : null
  }).filter(Boolean)

  // Generate detailed route instructions based on map.js logic
  const generateRouteInstructions = (path: string[]) => {
    const instructions: any[] = []
    let currentTransport = null
    let currentRoute = null
    let lastPOI = null
    let walkingStart = null
    let walkingEnd = null
    let hasCoaster = false

    // Helper function to check if two POIs are in the same area
    const areInSameArea = (poi1: any, poi2: any) => {
      if (!poi1?.position || !poi2?.position) return false
      if (poi1.area && poi2.area && poi1.area === poi2.area && String(poi1.area).trim() !== '') return true
      
      const dist = calculateDistance(poi1.position, poi2.position)
      if (poi1.id === 'user_location' && poi2.area && String(poi2.area).trim() !== '' && dist < 150) return true
      if (poi2.id === 'user_location' && poi1.area && String(poi1.area).trim() !== '' && dist < 150) return true
      
      if (!poi1.area && !poi2.area && dist < 75) return true
      return false
    }

    // Helper function to check if two stations are on the same cable route
    const areOnSameCableRoute = (station1: any, station2: any) => {
      if (!station1?.cable_route || !station2?.cable_route || station1.category !== 'transport' || station2.category !== 'transport') return false
      const routes1 = String(station1.cable_route).split(',').map((r: string) => r.trim()).filter((r: string) => r)
      const routes2 = String(station2.cable_route).split(',').map((r: string) => r.trim()).filter((r: string) => r)
      return routes1.length > 0 && routes2.length > 0 && routes1.some((route: string) => routes2.includes(route))
    }

    // Helper function to calculate distance
    const calculateDistance = (pos1: [number, number], pos2: [number, number]) => {
      if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2)) return 0
      const R = 6371e3 // Earth's radius in meters
      const φ1 = pos1[0] * Math.PI / 180
      const φ2 = pos2[0] * Math.PI / 180
      const Δφ = (pos2[0] - pos1[0]) * Math.PI / 180
      const Δλ = (pos2[1] - pos1[1]) * Math.PI / 180

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      return R * c
    }

    for (let i = 0; i < path.length - 1; i++) {
      const currentPOI = poiData.find((p: any) => String(p.id) === String(path[i]))
      const nextPOI = poiData.find((p: any) => String(p.id) === String(path[i + 1]))
      if (!currentPOI || !nextPOI) continue

      // Check transfer types
      const isTransferWalk = currentPOI.category === 'transport' && nextPOI.category === 'transport' && areInSameArea(currentPOI, nextPOI)
      const isCableCar = currentPOI.category === 'transport' && nextPOI.category === 'transport' && !areInSameArea(currentPOI, nextPOI)
      const isCoaster = currentPOI.id === '24' && nextPOI.id === '18' // Coaster start to end

      // Handle walking segment before transport
      if (walkingStart && (isCableCar || isCoaster || isTransferWalk)) {
        if (walkingStart.id !== currentPOI.id) {
          const distance = calculateDistance(walkingStart.position, currentPOI.position)
          const duration = Math.ceil(distance / 80) // 80m per minute walking
          instructions.push({
            type: 'walk',
            text: `Đi bộ từ ${getPoiName(walkingStart, currentLang)} đến ${getPoiName(currentPOI, currentLang)}`,
            distance: distance,
            duration: duration
          })
        }
        walkingStart = null
        walkingEnd = null
      }

      // Handle transfer walk (same area)
      if (isTransferWalk) {
        const distance = calculateDistance(currentPOI.position, nextPOI.position)
        const duration = Math.ceil(distance / 80)
        instructions.push({
          type: 'walk',
          text: `Đi bộ từ ${getPoiName(currentPOI, currentLang)} đến ${getPoiName(nextPOI, currentLang)}`,
          distance: distance,
          duration: duration
        })
        walkingStart = nextPOI
        continue
      }

      // Handle coaster
      if (isCoaster) {
        instructions.push({
          type: 'coaster',
          text: `Đi Máng trượt từ ${getPoiName(currentPOI, currentLang)} xu��ng ${getPoiName(nextPOI, currentLang)}`,
          distance: 0,
          duration: 15,
          routeName: 'Máng trượt'
        })
        currentTransport = 'coaster'
        hasCoaster = true
        walkingStart = nextPOI
        continue
      }

      // Handle cable car
      if (isCableCar) {
        const routes1 = String(currentPOI.cable_route || '').split(',').map((r: string) => r.trim()).filter((r: string) => r)
        const routes2 = String(nextPOI.cable_route || '').split(',').map((r: string) => r.trim()).filter((r: string) => r)
        const commonRoutes = routes1.filter((r: string) => routes2.includes(r))

        if (commonRoutes.length === 0) {
          if (walkingStart && walkingStart.id !== currentPOI.id) {
            const distance = calculateDistance(walkingStart.position, currentPOI.position)
            const duration = Math.ceil(distance / 80)
            instructions.push({
              type: 'walk',
              text: `Đi bộ từ ${getPoiName(walkingStart, currentLang)} đến ${getPoiName(currentPOI, currentLang)}`,
              distance: distance,
              duration: duration
            })
          }
          const distance = calculateDistance(currentPOI.position, nextPOI.position)
          const duration = Math.ceil(distance / 80)
          instructions.push({
            type: 'walk',
            text: `Đi bộ từ ${getPoiName(currentPOI, currentLang)} đến ${getPoiName(nextPOI, currentLang)}`,
            distance: distance,
            duration: duration
          })
          walkingStart = nextPOI
          continue
        }

        const routeName = commonRoutes[0]
        instructions.push({
          type: 'cable',
          text: `Đi ${routeName} từ ${getPoiName(currentPOI, currentLang)} đến ${getPoiName(nextPOI, currentLang)}`,
          distance: 0,
          duration: 10,
          routeName: routeName
        })
        currentTransport = 'cable_car'
        currentRoute = routeName
        walkingStart = nextPOI
      } else if (!isCableCar && !isCoaster) {
        // Walking segment
        if (!walkingStart) {
          walkingStart = currentPOI
        }
        walkingEnd = nextPOI
      }

      lastPOI = nextPOI
    }

    // Handle final walking segment
    if (walkingStart && walkingEnd && walkingStart.id !== walkingEnd.id) {
      const distance = calculateDistance(walkingStart.position, walkingEnd.position)
      const duration = Math.ceil(distance / 80)
      instructions.push({
        type: 'walk',
        text: `Đi bộ từ ${getPoiName(walkingStart, currentLang)} đến ${getPoiName(walkingEnd, currentLang)}`,
        distance: distance,
        duration: duration
      })
    }

    return { instructions, hasCoaster }
  }

  const { instructions, hasCoaster } = generateRouteInstructions(route.path)

  // Calculate totals
  const totalDistance = instructions.reduce((sum, inst) => sum + (inst.distance || 0), 0)
  const totalTime = instructions.reduce((sum, inst) => sum + (inst.duration || 0), 0)
  const totalCost = instructions.reduce((sum, inst) => {
    if (inst.type === 'cable') return sum + 150000 // 150k VND for cable car
    if (inst.type === 'coaster') return sum + 200000 // 200k VND for coaster
    return sum + 0 // Walking is free
  }, 0)

  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches
  const touchDataRef = useRef<{ startY: number, startExpanded: boolean } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchDataRef.current = { startY: e.touches[0].clientY, startExpanded: expanded }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDataRef.current) return
    const deltaY = e.changedTouches[0].clientY - touchDataRef.current.startY
    if (Math.abs(deltaY) < 20) {
      setExpanded(!expanded)
    } else if (deltaY > 30) {
      setExpanded(false)
    } else if (deltaY < -30) {
      setExpanded(true)
    }
    touchDataRef.current = null
  }

  return (
    <>
      {/* Route line on map */}
      {routeCoordinates.length > 1 && (
        <Polyline
          positions={routeCoordinates}
          color="#3B82F6"
          weight={4}
          opacity={0.8}
        />
      )}

      {/* Route instructions panel */}
      <div 
        className={cn("route-instructions-panel", isVisible && "visible")}
        style={isMobile ? {
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
        } : undefined}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      > 
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Route className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {route.startName && route.endName 
                    ? `${route.startName} → ${route.endName}`
                    : 'Lộ trình'
                  }
                </h2>
                <p className="text-white/80 text-sm">
                  {route.path?.length || 0} điểm dừng
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Route steps */}
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {instructions && instructions.length > 0 ? (
            instructions.map((instruction: any, index: number) => {
              const getIconColor = (type: string) => {
                switch (type) {
                  case 'walk': return 'bg-green-500'
                  case 'cable': return 'bg-blue-500'
                  case 'coaster': return 'bg-orange-500'
                  default: return 'bg-gray-500'
                }
              }

              const getIcon = (type: string) => {
                switch (type) {
                  case 'walk': return faPersonWalking
                  case 'cable': return faCableCar
                  case 'coaster': return faPersonWalking
                  default: return faSearch
                }
              }

              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getIconColor(instruction.type)}`}>
                      <FontAwesomeIcon icon={getIcon(instruction.type)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm leading-relaxed">
                        {instruction.text}
                      </p>
                      {instruction.routeName && (
                        <div className="mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {instruction.routeName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-blue-900 font-medium text-sm">
                    Lộ trình đã được tìm thấy
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    {route.path?.length || 0} điểm dừng
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cable routes info */}
        {instructions.some((inst: any) => inst.type === 'cable') && (
          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCableCar} className="text-blue-600" />
              <span className="text-sm text-gray-700">
                Tuyến: {instructions.filter((inst: any) => inst.type === 'cable').map((inst: any) => inst.routeName).join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const MapPage = () => {
  // Use the custom hooks for data and state management
  const {
    poiData,
    operatingHours,
    filteredPOIs,
    loading,
    error,
    searchTerm,
    activeCategory,
    currentLang,
    userLocation,
    setSearchTerm,
    setActiveCategory,
    setCurrentLang,
    setUserLocation,
    searchPOIs,
    getPOIById,
    getPOIStatus,
    addToHistory,
    getHistory
  } = useMapData()

  const {
    isTopBarVisible,
    isRouteInputsVisible,
    isTutorialOpen,
    isContactOpen,
    isDescentChoiceOpen,
    toggleTopBar,
    toggleRouteInputs,
    openTutorial,
    closeTutorial,
    openContact,
    closeContact,
    openDescentChoice,
    closeDescentChoice
  } = useMapControls()

  const {
    startPOI,
    endPOI,
    currentRoute,
    routeLoading,
    routeError,
    currentLang: routeLang,
    setStartPOI,
    setEndPOI,
    setCurrentRoute,
    findRoute,
    clearRoute,
    setLanguage: setRouteLanguage
  } = useRouteFinding(poiData, operatingHours)

  const {
    location,
    locationError,
    locationLoading,
    getCurrentLocation
  } = useGeolocation()

  // Route state
  const [startPoint, setStartPoint] = useState<any>(null)
  const [endPoint, setEndPoint] = useState<any>(null)
  const [startPointText, setStartPointText] = useState('')
  const [endPointText, setEndPointText] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [tileProvider, setTileProvider] = useState<'google' | 'osm'>('google')

  // POI Info Panel state
  const [selectedPOI, setSelectedPOI] = useState<any>(null)
  const [isPOIPanelVisible, setIsPOIPanelVisible] = useState(false)
  const [isRoutePanelVisible, setIsRoutePanelVisible] = useState(false)
  const [isPoiExpanded, setIsPoiExpanded] = useState(false)
  const [isRouteExpanded, setIsRouteExpanded] = useState(false)

  // Autocomplete states
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [startSuggestions, setStartSuggestions] = useState<any[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [endSuggestions, setEndSuggestions] = useState<any[]>([])
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)

  // Categories from original map.js - using FontAwesome icons
  const categories = [
    { key: 'religious', name: 'Tâm linh', icon: faOm },
    { key: 'attraction', name: 'Tham quan', icon: faSearch },
    { key: 'historical', name: 'Di tích', icon: faLandmark },
    { key: 'viewpoint', name: 'Ngắm cảnh', icon: faSearch },
    { key: 'food', name: 'Ẩm thực', icon: faUtensils },
    { key: 'transport', name: 'Di chuyển', icon: faBus },
    { key: 'parking', name: 'Bãi xe', icon: faParking },
    { key: 'amenities', name: 'Tiện ích', icon: faBell }
  ]

  // Helper function to get FontAwesome icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attraction': return faSearch
      case 'viewpoint': return faSearch
      case 'historical': return faLandmark
      case 'religious': return faOm
      case 'food': return faUtensils
      case 'transport': return faBus
      case 'parking': return faParking
      case 'amenities': return faBell
      default: return faSearch
    }
  }

  // Update user location when geolocation changes
  useEffect(() => {
    if (location) {
      setUserLocation(location)
    }
  }, [location, setUserLocation])

  // Update route language when current language changes
  useEffect(() => {
    setRouteLanguage(currentLang)
  }, [currentLang, setRouteLanguage])

  const handleSearch = () => {
    // Ensure only top bar is visible
    if (!isTopBarVisible) {
      toggleTopBar()
    }
    if (isRouteInputsVisible) {
      toggleRouteInputs()
    }
    searchInputRef.current?.focus()
  }

  const handleDirections = () => {
    // Toggle route inputs; ensure exclusivity with Top bar
    if (isRouteInputsVisible) {
      toggleRouteInputs()
      return
    }
    if (isTopBarVisible) {
      toggleTopBar()
    }
    toggleRouteInputs()
  }

  const handleLocate = () => {
    getCurrentLocation()
  }

  const handleTutorial = () => {
    openTutorial()
  }

  const handleContact = () => {
    openContact()
  }

  const handleToggleTiles = () => {
    setTileProvider(prev => prev === 'google' ? 'osm' : 'google')
  }

  const handleCableCar = () => {
    closeDescentChoice()
    findRouteWithDescentChoice('cable_car')
  }

  const handleAlpineCoaster = () => {
    closeDescentChoice()
    findRouteWithDescentChoice('alpine_coaster')
  }

  // Helper function to calculate distance between two points
  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const [lat1, lon1] = point1
    const [lat2, lon2] = point2
    
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Handle find route with operating hours check
  const handleFindRoute = async () => {
    if (!startPoint || !endPoint) {
      // Show user-friendly error message
      alert('Vui lòng chọn điểm bắt đầu và điểm kết thúc')
      return
    }

    try {
      // Check if this is a descent route from Chùa Bà to Chân núi
      if (startPoint.area === 'Chùa Bà' && endPoint.area === 'Chân núi') {
        console.log('DEBUG: Found descent route from Chua Ba to Chan Nui')
        console.log('DEBUG: Operating hours data:', operatingHours)
        const descentOptions = checkDescentOptionsFromChuaBa(operatingHours)
        console.log('DEBUG: Descent options:', descentOptions)
        
        // Always show popup for descent route from Chua Ba to Chan Nui
        console.log('DEBUG: Showing descent choice popup')
        openDescentChoice()
        return
      }

      // Use the findRoute function from the hook for normal routes
      const routeResult = await findRoute(startPoint.id, endPoint.id)
      
      if (routeResult) {
        // Add start and end names to the route result
        const enhancedRoute = {
          ...routeResult,
          startName: getPoiName(startPoint, currentLang),
          endName: getPoiName(endPoint, currentLang)
        }

        // Update the current route in the hook
        setCurrentRoute(enhancedRoute)
        setIsPOIPanelVisible(false)
        setIsRoutePanelVisible(true)
        toggleRouteInputs() // Hide route inputs after finding route
      } else {
        // Show user-friendly error message when no route found
        alert('Không tìm thấy đường đi giữa hai điểm này. Vui lòng thử lại với các điểm khác.')
      }

    } catch (error) {
      console.error('Error finding route:', error)
      // Show user-friendly error message
      alert('Có lỗi xảy ra khi tìm đường. Vui lòng thử lại sau.')
    }
  }

  // Helper function to find route with specific descent choice
  const findRouteWithDescentChoice = async (choice: 'cable_car' | 'alpine_coaster') => {
    try {
      if (choice === 'alpine_coaster') {
        // Force route to include Alpine Coaster segment 24 -> 18 by composing two legs
        // 1) From start to Coaster start (24)
        const firstLeg = await findRoute(startPoint!.id, COASTER_START_ID)
        // 2) From Coaster end (18) to destination
        const secondLeg = await findRoute(COASTER_END_ID, endPoint!.id)

        if (firstLeg && secondLeg) {
          const combinedPath = [
            ...firstLeg.path,
            ...secondLeg.path
          ]

          const enhancedRoute = {
            path: combinedPath,
            cableRoutes: [...new Set([...(firstLeg.cableRoutes || []), ...(secondLeg.cableRoutes || [])])],
            cost: (firstLeg.cost || 0) + (secondLeg.cost || 0),
            startName: getPoiName(startPoint!, currentLang),
            endName: getPoiName(endPoint!, currentLang),
            descentChoice: choice
          }

          setCurrentRoute(enhancedRoute)
          setIsPOIPanelVisible(false)
          setIsRoutePanelVisible(true)
          toggleRouteInputs()
          return
        }
        // If either leg failed, fall back to normal routing
      }

      // Default: normal route
      const routeResult = await findRoute(startPoint!.id, endPoint!.id)
      if (routeResult) {
        const enhancedRoute = {
          ...routeResult,
          startName: getPoiName(startPoint!, currentLang),
          endName: getPoiName(endPoint!, currentLang),
          descentChoice: choice
        }
        setCurrentRoute(enhancedRoute)
        setIsPOIPanelVisible(false)
        setIsRoutePanelVisible(true)
        toggleRouteInputs()
      }
    } catch (error) {
      console.error('Error finding route with descent choice:', error)
    }
  }

  // Use imported checkDescentOptionsFromChuaBa from mapService for accurate status


  // Handle POI click to show info panel
  const handlePOIClick = useCallback((poi: any) => {
    // Close route panel if open to avoid overlap on mobile
    setIsRoutePanelVisible(false)
    setSelectedPOI(poi)
    setIsPOIPanelVisible(true)
    setIsPoiExpanded(true)
  }, [])

  // Handle get directions
  const handleGetDirections = useCallback((poi: any, direction: 'from' | 'to') => {
    if (direction === 'from') {
      // Set start point for "Từ đây"
      setStartPoint(poi)
      setStartPointText(getPoiName(poi, currentLang))
    } else {
      // Set end point for "Đến đây"
      setEndPoint(poi)
      setEndPointText(getPoiName(poi, currentLang))
    }
    
    // Show route inputs
    toggleRouteInputs()
    setIsPOIPanelVisible(false)
    setIsPoiExpanded(false)
  }, [currentLang, toggleRouteInputs])

  const handleClosePOIPanel = useCallback(() => {
    setIsPOIPanelVisible(false)
    setSelectedPOI(null)
    setIsPoiExpanded(false)
  }, [])

  const handleCloseRoutePanel = useCallback(() => {
    setIsRoutePanelVisible(false)
    clearRoute()
    setIsRouteExpanded(false)
  }, [clearRoute])

  // Autocomplete functions
  const generateSuggestions = useCallback((input: string, maxResults: number = 8) => {
    if (!input.trim() || input.length < 2) return []
    
    const searchTerm = input.toLowerCase().trim()
    const suggestions = poiData
      .filter(poi => {
        const nameVi = (poi.name || '').toLowerCase()
        const nameEn = (poi.name_en || '').toLowerCase()
        return nameVi.includes(searchTerm) || nameEn.includes(searchTerm)
      })
      .slice(0, maxResults)
      .map(poi => ({
        ...poi,
        displayName: getPoiName(poi, currentLang),
        category: poi.category
      }))
    
    return suggestions
  }, [poiData, currentLang])

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim().length >= 2) {
      const suggestions = generateSuggestions(value)
      setSearchSuggestions(suggestions)
      setShowSearchSuggestions(suggestions.length > 0)
    } else {
      setSearchSuggestions([])
      setShowSearchSuggestions(false)
    }
  }, [generateSuggestions])

  const handleStartPointChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStartPointText(value)
    setStartPoint(null) // Clear POI object when user types
    
    if (value.trim().length >= 2) {
      const suggestions = generateSuggestions(value)
      setStartSuggestions(suggestions)
      setShowStartSuggestions(suggestions.length > 0)
    } else {
      setStartSuggestions([])
      setShowStartSuggestions(false)
    }
  }, [generateSuggestions])

  const handleEndPointChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEndPointText(value)
    setEndPoint(null) // Clear POI object when user types
    
    if (value.trim().length >= 2) {
      const suggestions = generateSuggestions(value)
      setEndSuggestions(suggestions)
      setShowEndSuggestions(suggestions.length > 0)
    } else {
      setEndSuggestions([])
      setShowEndSuggestions(false)
    }
  }, [generateSuggestions])

  const handleSearchSuggestionClick = useCallback((poi: any) => {
    setSearchTerm(poi.displayName)
    setShowSearchSuggestions(false)
    setSearchSuggestions([])
    addToHistory(poi.displayName)
  }, [addToHistory])

  const handleStartSuggestionClick = useCallback((poi: any) => {
    setStartPoint(poi) // Store POI object
    setStartPointText(poi.displayName) // Update text input
    setShowStartSuggestions(false)
    setStartSuggestions([])
  }, [])

  const handleEndSuggestionClick = useCallback((poi: any) => {
    setEndPoint(poi) // Store POI object
    setEndPointText(poi.displayName) // Update text input
    setShowEndSuggestions(false)
    setEndSuggestions([])
  }, [])

  const hideAllSuggestions = useCallback(() => {
    setShowSearchSuggestions(false)
    setShowStartSuggestions(false)
    setShowEndSuggestions(false)
  }, [])

  // Translation helper function
  const t = useCallback((key: string, ...args: any[]) => getUIText(key, currentLang, ...args), [currentLang])

  // Debug logging - only log when data changes significantly
  useEffect(() => {
    console.log('MapPage render:', { loading, error, poiDataLength: poiData.length, filteredPOIsLength: filteredPOIs.length })
  }, [loading, error, poiData.length, filteredPOIs.length])

  // Test descent options logic - only run when operating hours change
  useEffect(() => {
    if (operatingHours.length > 0) {
      const testDescentOptions = checkDescentOptionsFromChuaBa(operatingHours)
      console.log('Test descent options result:', testDescentOptions)
    }
  }, [operatingHours])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang tải bản đồ</h3>
          <p className="text-gray-600 text-sm">Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể tải dữ liệu</h3>
          <p className="text-gray-600 text-sm mb-6">
            {error.includes('Service unavailable') || error.includes('HTML instead of JSON')
              ? 'Dịch vụ tạm thời không khả dụng. Đang sử dụng dữ liệu cục bộ.'
              : `Lỗi: ${error}`
            }
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-2xl transition duration-200 shadow-md touch-manipulation"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden" onClick={hideAllSuggestions}>
      {/* Top Bar */}
      <div className={cn(
        "hidden top-bar bg-white border-b border-gray-200 p-2 sm:p-3 md:p-4 shadow-sm transition-opacity duration-200",
        !isTopBarVisible && "opacity-0 pointer-events-none"
      )}>
        {/* Search Bar */}
        <div className="search-bar relative flex items-center bg-gray-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-2 sm:mb-3" onClick={(e) => e.stopPropagation()}>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Tìm kiếm địa điểm..." 
            value={searchTerm}
            onChange={handleSearchInputChange}
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSearchSuggestions(true)
              }
            }}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => setShowSearchSuggestions(false), 200)
            }}
            className="flex-grow border-none outline-none bg-transparent text-sm sm:text-base text-gray-700 placeholder-gray-500"
          />
          <Search className="text-gray-400 pl-2 cursor-pointer w-5 h-5" />
          <button 
            type="button" 
            className="icon text-primary-500 hover:text-primary-600 pl-2 hidden md:inline-flex items-center justify-center" 
            aria-label="Tìm đường"
            onClick={handleDirections}
          >
            <Route className="w-5 h-5" />
          </button>
          
          {/* Search Suggestions Dropdown */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
              {searchSuggestions.map((poi) => (
                <div
                  key={poi.id}
                  className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSearchSuggestionClick(poi)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                             <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {poi.displayName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Categories */}
        <div className="filter-categories-wrapper relative flex items-center">
          <button className="hidden md:flex absolute left-0 z-10 h-full items-center justify-center px-2 bg-white/80 hover:bg-white rounded-l-lg shadow transition-all">
            <span className="text-gray-600">‹</span>
          </button>
          <div className="filter-categories flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 w-full scrollbar-hide">
            <button 
              onClick={() => setActiveCategory(null)}
              className={cn(
                "flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap",
                !activeCategory 
                  ? "bg-primary-500 text-white" 
                  : "bg-gray-200 hover:bg-gray-300"
              )}
            >
               <FontAwesomeIcon icon={faClipboardList} className="mr-1.5" />
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={cn(
                  "flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap",
                  activeCategory === category.key 
                    ? "bg-primary-500 text-white" 
                    : "bg-gray-200 hover:bg-gray-300"
                )}
              >
                <FontAwesomeIcon icon={category.icon} className="mr-1.5" />
                {category.name}
              </button>
            ))}
          </div>
          <button className="hidden md:flex absolute right-0 z-10 h-full items-center justify-center px-2 bg-white/80 hover:bg-white rounded-r-lg shadow transition-all">
            <span className="text-gray-600">›</span>
          </button>
        </div>
      </div>

      {/* Route Inputs (hidden here; rendered inside map overlay) */}
      <div className={cn(
        "hidden",
        !isRouteInputsVisible && "hidden"
      )} onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Điểm bắt đầu"
              value={startPointText}
              onChange={handleStartPointChange}
              onFocus={() => {
                if (startSuggestions.length > 0) {
                  setShowStartSuggestions(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowStartSuggestions(false), 200)
              }}
              className="w-full p-4 border border-gray-300 rounded-2xl text-base bg-white text-gray-700 placeholder-gray-400 min-h-[48px] touch-manipulation"
            />
            {showStartSuggestions && startSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto mt-2">
                {startSuggestions.map((poi) => (
                  <div
                    key={poi.id}
                    className="p-4 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl touch-manipulation"
                    onClick={() => handleStartSuggestionClick(poi)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {poi.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Điểm kết thúc"
              value={endPointText}
              onChange={handleEndPointChange}
              onFocus={() => {
                if (endSuggestions.length > 0) {
                  setShowEndSuggestions(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowEndSuggestions(false), 200)
              }}
              className="w-full p-4 border border-gray-300 rounded-2xl text-base bg-white text-gray-700 placeholder-gray-400 min-h-[48px] touch-manipulation"
            />
            {showEndSuggestions && endSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto mt-2">
                {endSuggestions.map((poi) => (
                  <div
                    key={poi.id}
                    className="p-4 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl touch-manipulation"
                    onClick={() => handleEndSuggestionClick(poi)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {poi.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleFindRoute}
            disabled={routeLoading}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-2xl text-base transition duration-150 flex items-center justify-center min-h-[48px] touch-manipulation shadow-md"
          >
            {routeLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Đang tìm...
              </>
            ) : (
              <>
                <Route className="w-5 h-5 mr-2" />
                Tìm đường
              </>
            )}
          </button>
          <button 
            onClick={handleDirections}
            aria-label="Đóng tìm đường" 
            className="ml-2 w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Route Error Display */}
        {routeError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{routeError}</p>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="map-area relative bg-gray-200 flex-1 overflow-hidden">
        {/* Map Top Bar overlay (inside map area) */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-[1001] p-2 sm:p-3 md:p-4",
          isTopBarVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-200"
        )}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-2 sm:p-3 md:max-w-5xl md:mx-auto">
            {/* Search Bar */}
            <div className="search-bar relative flex items-center bg-gray-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-2 sm:mb-3" onClick={(e) => e.stopPropagation()}>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Tìm kiếm địa điểm..." 
                value={searchTerm}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSearchSuggestions(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSearchSuggestions(false), 200)
                }}
                className="flex-grow border-none outline-none bg-transparent text-sm sm:text-base text-gray-700 placeholder-gray-500"
              />
              <Search className="text-gray-400 pl-2 cursor-pointer w-5 h-5" />
              <button 
                type="button" 
                className="icon text-primary-500 hover:text-primary-600 pl-2 hidden md:inline-flex items-center justify-center" 
                aria-label="Tìm đường"
                onClick={handleDirections}
              >
                <Route className="w-5 h-5" />
              </button>
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1100]">
                  {searchSuggestions.map((poi) => (
                    <div
                      key={poi.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSearchSuggestionClick(poi)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {poi.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Categories */}
            <div className="filter-categories-wrapper relative flex items-center">
              <button className="hidden md:hidden absolute left-0 z-10 h-full items-center justify-center px-2 bg-white/80 hover:bg-white rounded-l-lg shadow transition-all">
                <span className="text-gray-600">‹</span>
              </button>
              <div className="filter-categories flex gap-1.5 sm:gap-2 overflow-x-auto md:overflow-visible md:flex-wrap md:justify-center pb-1 w-full scrollbar-hide">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap",
                    !activeCategory 
                      ? "bg-primary-500 text-white" 
                      : "bg-gray-200 hover:bg-gray-300"
                  )}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="mr-1.5" />
                  Tất cả
                </button>
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setActiveCategory(category.key)}
                    className={cn(
                      "flex items-center px-2.5 py-1.5 text-xs sm:text-sm rounded-full transition-colors duration-200 whitespace-nowrap",
                      activeCategory === category.key 
                        ? "bg-primary-500 text-white" 
                        : "bg-gray-200 hover:bg-gray-300"
                    )}
                  >
                    <FontAwesomeIcon icon={category.icon} className="mr-1.5" />
                    {category.name}
                  </button>
                ))}
              </div>
              <button className="hidden md:hidden absolute right-0 z-10 h-full items-center justify-center px-2 bg-white/80 hover:bg-white rounded-r-lg shadow transition-all">
                <span className="text-gray-600">›</span>
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải bản đồ...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">Lỗi tải bản đồ: {error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : poiData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Không có dữ liệu điểm tham quan</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[11.370994909356133, 106.17721663114253]}
            zoom={15}
            className="w-full h-full"
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
          {/* Reserve space top for overlay so map controls are not hidden */}
          <div className="absolute top-0 left-0 right-0 h-0 pointer-events-none" />
          {tileProvider === 'google' ? (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              attribution="© Google"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap contributors"
            />
          )}
          
          {/* Map Controls */}
          <MapControls 
            onLocate={handleLocate}
            onSearch={handleSearch}
            onTutorial={handleTutorial}
            onContact={handleContact}
            onToggleTiles={handleToggleTiles}
            tileProvider={tileProvider}
            topOffsetPx={isTopBarVisible ? 112 : (isRouteInputsVisible ? 112 : 16)}
          />
          
          {/* Zoom Controls */}
          <ZoomControls />

          {/* POI Markers */}
          <POIMarkers 
            pois={filteredPOIs} 
            currentLang={currentLang} 
            onMarkerClick={handlePOIClick}
          />

          {/* Route Display */}
          <RouteDisplay 
            route={currentRoute}
            isVisible={isRoutePanelVisible}
            onClose={handleCloseRoutePanel}
            currentLang={currentLang}
            poiData={poiData}
            expanded={isRouteExpanded}
            setExpanded={setIsRouteExpanded}
          />
          
          {/* Debug Info */}
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow z-[1002] text-xs">
            POIs: {filteredPOIs.length} | Loading: {loading ? 'Yes' : 'No'} | Error: {error || 'None'}
          </div>
        </MapContainer>
        )}

        {/* Floating Action Buttons (Mobile) */}
        <FloatingActionButtons 
          onSearch={handleSearch}
          onDirections={handleDirections}
          onLocate={handleLocate}
          onTutorial={handleTutorial}
        />
        {/* Route Inputs overlay inside map area */}
        <div className={cn(
          "absolute left-0 right-0 z-[1001] p-3",
          isRouteInputsVisible ? "top-20" : "hidden"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="mx-2 md:mx-auto md:max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-md p-4">
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Điểm bắt đầu"
                  value={startPointText}
                  onChange={handleStartPointChange}
                  onFocus={() => {
                    if (startSuggestions.length > 0) {
                      setShowStartSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowStartSuggestions(false), 200)
                  }}
                  className="w-full p-4 border border-gray-300 rounded-2xl text-base bg-white text-gray-700 placeholder-gray-400 min-h-[48px] touch-manipulation"
                />
                {showStartSuggestions && startSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto mt-2">
                    {startSuggestions.map((poi) => (
                      <div
                        key={poi.id}
                        className="p-4 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl touch-manipulation"
                        onClick={() => handleStartSuggestionClick(poi)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {poi.displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Điểm kết thúc"
                  value={endPointText}
                  onChange={handleEndPointChange}
                  onFocus={() => {
                    if (endSuggestions.length > 0) {
                      setShowEndSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowEndSuggestions(false), 200)
                  }}
                  className="w-full p-4 border border-gray-300 rounded-2xl text-base bg-white text-gray-700 placeholder-gray-400 min-h-[48px] touch-manipulation"
                />
                {showEndSuggestions && endSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto mt-2">
                    {endSuggestions.map((poi) => (
                      <div
                        key={poi.id}
                        className="p-4 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl touch-manipulation"
                        onClick={() => handleEndSuggestionClick(poi)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <FontAwesomeIcon icon={getCategoryIcon(poi.category)} className="text-primary-600 text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {poi.displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {poi.area && `${poi.area} • `}{t(poi.category || 'attraction')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleFindRoute}
                disabled={routeLoading}
                className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-2xl text-base transition duration-150 flex items-center justify-center min-h-[48px] touch-manipulation shadow-md"
              >
                {routeLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <Route className="w-5 h-5 mr-2" />
                    Tìm đường
                  </>
                )}
              </button>
              <button 
                onClick={handleDirections}
                aria-label="Đóng tìm đường" 
                className="ml-2 w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {routeError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{routeError}</p>
              </div>
            )}
          </div>
        </div>
        {/* POI Info Panel (keep within map area) */}
        <POIInfoPanel 
          poi={selectedPOI}
          isVisible={isPOIPanelVisible}
          onClose={handleClosePOIPanel}
          onGetDirections={handleGetDirections}
          currentLang={currentLang}
          operatingHours={operatingHours}
          expanded={isPoiExpanded}
          setExpanded={setIsPoiExpanded}
        />
      </div>

      {/* Popups (global fixed overlays) */}
      <TutorialPopup 
        isOpen={isTutorialOpen} 
        onClose={closeTutorial} 
      />
      
      <ContactPopup 
        isOpen={isContactOpen} 
        onClose={closeContact} 
      />
      
      <DescentChoicePopup 
        isOpen={isDescentChoiceOpen} 
        onClose={closeDescentChoice}
        onCableCar={handleCableCar}
        onAlpineCoaster={handleAlpineCoaster}
        descentOptions={startPoint?.area === 'Chùa Bà' && endPoint?.area === 'Chân núi' ? checkDescentOptionsFromChuaBa(operatingHours) : undefined}
      />
    </div>
  )
}

export default MapPage
