import { useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from './firebase'

type Lang = 'ar' | 'en'

const T = {
  ar: {
    title: 'احجز موعدك ✂️',
    step1: '1. الخدمة',
    step2: '2. اليوم',
    step3: '3. الساعة',
    step4: '4. معلوماتك',
    namePh: 'الاسم',
    phonePh: 'رقم الهاتف (0555123456)',
    confirm: 'تأكيد الحجز',
    currency: 'دج',
    booked: 'تم الحجز',
    doneMsg: (n: string, d: string, t: string) => n + '، موعدك يوم ' + d + ' على الساعة ' + t + '.',
    again: 'حجز جديد',
    errLoad: 'تعذر تحميل المواعيد',
    errFill: 'عمّر كل الخانات واختار الخدمة والساعة',
    errPhone: 'رقم الهاتف غير صحيح (مثال: 0555123456)',
    errSave: 'صار خطأ، أو الساعة محجوزة. حاول مرة أخرى',
    switchTo: 'English',
    services: { cut: 'قص الشعر', beard: 'تهذيب اللحية', both: 'قص + لحية' },
  },
  en: {
    title: 'Book your appointment ✂️',
    step1: '1. Service',
    step2: '2. Date',
    step3: '3. Time',
    step4: '4. Your details',
    namePh: 'Full name',
    phonePh: 'Phone number (0555123456)',
    confirm: 'Confirm booking',
    currency: 'DZD',
    booked: 'Booking confirmed',
    doneMsg: (n: string, d: string, t: string) => 'Thanks ' + n + '! Your appointment is on ' + d + ' at ' + t + '.',
    again: 'New booking',
    errLoad: 'Could not load available times',
    errFill: 'Please fill in all fields and choose a service and a time',
    errPhone: 'Invalid phone number (example: 0555123456)',
    errSave: 'Something went wrong, or the time is already booked. Please try again',
    switchTo: 'العربية',
    services: { cut: 'Haircut', beard: 'Beard trim', both: 'Haircut + beard' },
  },
}

const SERVICES = [
  { id: 'cut' as const, price: 800 },
  { id: 'beard' as const, price: 500 },
  { id: 'both' as const, price: 1200 },
]

const SLOTS: string[] = []
for (let h = 9; h < 18; h++) {
  SLOTS.push(String(h).padStart(2, '0') + ':00')
  SLOTS.push(String(h).padStart(2, '0') + ':30')
}

const today = new Date().toLocaleDateString('en-CA')

export default function App() {
  const [lang, setLang] = useState<Lang>('ar')
  const t = T[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const [service, setService] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [taken, setTaken] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTime('')
    const load = async () => {
      try {
        const q = query(collection(db, 'slots'), where('date', '==', date))
        const snap = await getDocs(q)
        setTaken(snap.docs.map((d) => d.data().time as string))
      } catch (e) {
        console.error(e)
        setError(T[lang].errLoad)
      }
    }
    load()
  }, [date])

  const submit = async () => {
    setError('')
    if (!service || !time || !name.trim()) {
      setError(t.errFill)
      return
    }
    if (!/^0[5-7][0-9]{8}$/.test(phone)) {
      setError(t.errPhone)
      return
    }
    setLoading(true)
    try {
      await setDoc(doc(db, 'slots', date + '_' + time), { date, time })
      await addDoc(collection(db, 'bookings'), {
        service,
        date,
        time,
        name: name.trim(),
        phone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      setTaken([...taken, time])
      setDone(true)
    } catch (e) {
      console.error(e)
      setError(t.errSave)
    }
    setLoading(false)
  }

  const langButton = (
    <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="text-sm underline text-neutral-600">
      {t.switchTo}
    </button>
  )

  if (done) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-bold mb-2">{t.booked}</h2>
          <p className="text-neutral-600">{t.doneMsg(name, date, time)}</p>
          <button
            className="mt-6 bg-neutral-900 text-white rounded-lg px-5 py-2"
            onClick={() => { setDone(false); setTime(''); setService('') }}
          >
            {t.again}
          </button>
          <div className="mt-4">{langButton}</div>
        </div>
      </div>
    )
  }

  return (
    <div dir={dir} className="min-h-screen bg-neutral-100 p-4 flex justify-center">
      <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full h-fit">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          {langButton}
        </div>

        <p className="font-semibold mb-2">{t.step1}</p>
        <div className="grid gap-2 mb-5">
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => setService(s.id)}
              className={'flex justify-between border rounded-lg px-4 py-3 ' +
                (service === s.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300')}
            >
              <span>{t.services[s.id]}</span>
              <span>{s.price} {t.currency}</span>
            </button>
          ))}
        </div>

        <p className="font-semibold mb-2">{t.step2}</p>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-2 w-full mb-5"
        />

        <p className="font-semibold mb-2">{t.step3}</p>
        <div dir="ltr" className="grid grid-cols-4 gap-2 mb-5">
          {SLOTS.map((slot) => {
            const isTaken = taken.includes(slot)
            return (
              <button
                key={slot}
                disabled={isTaken}
                onClick={() => setTime(slot)}
                className={'rounded-lg py-2 text-sm border ' +
                  (isTaken ? 'bg-neutral-200 text-neutral-400 line-through'
                    : time === slot ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-300')}
              >
                {slot}
              </button>
            )
          })}
        </div>

        <p className="font-semibold mb-2">{t.step4}</p>
        <input
          placeholder={t.namePh}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-2 w-full mb-2"
        />
        <input
          placeholder={t.phonePh}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
          className="border border-neutral-300 rounded-lg px-3 py-2 w-full mb-4"
        />

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={loading}
          className="bg-neutral-900 text-white rounded-lg py-3 w-full font-semibold disabled:opacity-50"
        >
          {loading ? '...' : t.confirm}
        </button>
      </div>
    </div>
  )
}
