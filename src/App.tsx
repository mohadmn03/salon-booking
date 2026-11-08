import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

type Lang = "ar" | "en";
type ServiceId = "cut" | "beard" | "both";

const T = {
  ar: {
    brand: "صالون الأناقة",
    tagline: "احجز موعدك في أقل من دقيقة",
    step1: "اختر الخدمة",
    step2: "اختر اليوم",
    step3: "اختر الساعة",
    step4: "معلوماتك",
    morning: "صباحا",
    afternoon: "مساء",
    namePh: "الاسم الكامل",
    phonePh: "رقم الهاتف (0555123456)",
    confirm: "تأكيد الحجز",
    pick: "اختر الخدمة والساعة",
    currency: "دج",
    booked: "تم الحجز بنجاح",
    doneSub: "نستناك في الموعد التالي",
    labelService: "الخدمة",
    labelDate: "اليوم",
    labelTime: "الساعة",
    again: "حجز جديد",
    errLoad: "تعذر تحميل المواعيد",
    errFill: "عمّر الاسم واختار الخدمة والساعة",
    errPhone: "رقم الهاتف غير صحيح (مثال: 0555123456)",
    errSave: "صار خطأ، أو الساعة محجوزة. حاول مرة أخرى",
    switchTo: "English",
    services: { cut: "قص الشعر", beard: "تهذيب اللحية", both: "قص + لحية" },
  },
  en: {
    brand: "Elegance Barber",
    tagline: "Book your appointment in under a minute",
    step1: "Choose a service",
    step2: "Choose a day",
    step3: "Choose a time",
    step4: "Your details",
    morning: "Morning",
    afternoon: "Afternoon",
    namePh: "Full name",
    phonePh: "Phone number (0555123456)",
    confirm: "Confirm booking",
    pick: "Pick a service and a time",
    currency: "DZD",
    booked: "Booking confirmed",
    doneSub: "See you at your appointment",
    labelService: "Service",
    labelDate: "Date",
    labelTime: "Time",
    again: "New booking",
    errLoad: "Could not load available times",
    errFill: "Please enter your name and choose a service and a time",
    errPhone: "Invalid phone number (example: 0555123456)",
    errSave:
      "Something went wrong, or the time is already booked. Please try again",
    switchTo: "العربية",
    services: { cut: "Haircut", beard: "Beard trim", both: "Haircut + beard" },
  },
};

const SERVICES: { id: ServiceId; price: number; icon: string }[] = [
  { id: "cut", price: 800, icon: "✂️" },
  { id: "beard", price: 500, icon: "🧔" },
  { id: "both", price: 1200, icon: "💈" },
];

const MORNING: string[] = [];
const AFTERNOON: string[] = [];
for (let h = 9; h < 18; h++) {
  const list = h < 12 ? MORNING : AFTERNOON;
  list.push(String(h).padStart(2, "0") + ":00");
  list.push(String(h).padStart(2, "0") + ":30");
}

const today = new Date().toLocaleDateString("en-CA");

const card = "bg-stone-900 border border-stone-800 rounded-2xl p-5";
const input =
  "w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-500 outline-none focus:border-amber-400 transition";

export default function App() {
  const [lang, setLang] = useState<Lang>("ar");
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [service, setService] = useState<ServiceId | "">("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTime("");
    const load = async () => {
      try {
        const q = query(collection(db, "slots"), where("date", "==", date));
        const snap = await getDocs(q);
        setTaken(snap.docs.map((d) => d.data().time as string));
      } catch (e) {
        console.error(e);
        setError(T[lang].errLoad);
      }
    };
    load();
  }, [date]);

  const prettyDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(
      lang === "ar" ? "ar-DZ" : "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      },
    );

  const selected = SERVICES.find((s) => s.id === service);

  const submit = async () => {
    setError("");
    if (!service || !time || !name.trim()) {
      setError(t.errFill);
      return;
    }
    if (!/^0[5-7][0-9]{8}$/.test(phone)) {
      setError(t.errPhone);
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, "slots", date + "_" + time), { date, time });
      await addDoc(collection(db, "bookings"), {
        service,
        date,
        time,
        name: name.trim(),
        phone,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setTaken([...taken, time]);
      setDone(true);
    } catch (e) {
      console.error(e);
      setError(t.errSave);
    }
    setLoading(false);
  };

  const langButton = (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="text-sm border border-stone-700 text-stone-300 rounded-full px-4 py-1.5 hover:border-amber-400 hover:text-amber-400 transition"
    >
      {t.switchTo}
    </button>
  );

  const slotGroup = (label: string, list: string[]) => (
    <div className="mb-4 last:mb-0">
      <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">
        {label}
      </p>
      <div dir="ltr" className="grid grid-cols-4 gap-2">
        {list.map((slot) => {
          const isTaken = taken.includes(slot);
          return (
            <button
              key={slot}
              disabled={isTaken}
              onClick={() => setTime(slot)}
              className={
                "rounded-xl py-2.5 text-sm font-semibold border transition " +
                (isTaken
                  ? "bg-stone-950 border-stone-900 text-stone-700 line-through cursor-not-allowed"
                  : time === slot
                    ? "bg-amber-400 border-amber-400 text-stone-950"
                    : "border-stone-700 text-stone-200 hover:border-amber-400")
              }
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (done && selected) {
    return (
      <div
        dir={dir}
        className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4"
      >
        <div className={card + " w-full max-w-sm text-center"}>
          <div className="w-16 h-16 rounded-full bg-amber-400 text-stone-950 text-3xl flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold mb-1">{t.booked}</h2>
          <p className="text-stone-400 mb-6">{t.doneSub}</p>
          <div className="bg-stone-950 rounded-xl p-4 text-start space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-stone-500">{t.labelService}</span>
              <span className="font-semibold">{t.services[selected.id]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t.labelDate}</span>
              <span className="font-semibold">{prettyDate(date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t.labelTime}</span>
              <span className="font-semibold" dir="ltr">
                {time}
              </span>
            </div>
          </div>
          <button
            className="bg-amber-400 text-stone-950 font-bold rounded-xl px-6 py-3 w-full"
            onClick={() => {
              setDone(false);
              setTime("");
              setService("");
            }}
          >
            {t.again}
          </button>
          <div className="mt-4">{langButton}</div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-stone-950 text-stone-100 pb-40">
      <header className="px-5 pt-8 pb-6 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <span className="text-amber-400 text-2xl">💈</span>
          {langButton}
        </div>
        <h1 className="text-3xl font-extrabold">{t.brand}</h1>
        <p className="text-stone-400 mt-1">{t.tagline}</p>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-4">
        <section className={card}>
          <h2 className="font-bold mb-3">
            <span className="text-amber-400">01</span> · {t.step1}
          </h2>
          <div className="grid gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setService(s.id)}
                className={
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition " +
                  (service === s.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-stone-700 hover:border-stone-500")
                }
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="font-semibold flex-1 text-start">
                  {t.services[s.id]}
                </span>
                <span className="text-amber-400 font-bold">
                  {s.price} {t.currency}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="font-bold mb-3">
            <span className="text-amber-400">02</span> · {t.step2}
          </h2>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input + " [color-scheme:dark]"}
          />
        </section>

        <section className={card}>
          <h2 className="font-bold mb-3">
            <span className="text-amber-400">03</span> · {t.step3}
          </h2>
          {slotGroup(t.morning, MORNING)}
          {slotGroup(t.afternoon, AFTERNOON)}
        </section>

        <section className={card}>
          <h2 className="font-bold mb-3">
            <span className="text-amber-400">04</span> · {t.step4}
          </h2>
          <input
            placeholder={t.namePh}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input + " mb-2"}
          />
          <input
            placeholder={t.phonePh}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            className={input}
          />
          {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
        </section>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-stone-950/90 backdrop-blur border-t border-stone-800 p-4">
        <div className="max-w-md mx-auto">
          <p className="text-sm text-stone-400 mb-2 text-center">
            {selected && time
              ? t.services[selected.id] +
                " · " +
                prettyDate(date) +
                " · " +
                time
              : t.pick}
          </p>
          <button
            onClick={submit}
            disabled={loading}
            className="bg-amber-400 text-stone-950 font-extrabold rounded-xl py-3.5 w-full disabled:opacity-50"
          >
            {loading ? "..." : t.confirm}
            {selected && !loading
              ? " · " + selected.price + " " + t.currency
              : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
