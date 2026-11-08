import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";

type Booking = {
  id: string;
  service: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  status: string;
};

const SERVICE_NAMES: Record<string, string> = {
  cut: "قص الشعر",
  beard: "تهذيب اللحية",
  both: "قص + لحية",
};

const today = new Date().toLocaleDateString("en-CA");

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("date", "==", date));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Booking, "id">),
        }));
        list.sort((a, b) => a.time.localeCompare(b.time));
        setBookings(list);
      },
      (e) => {
        console.error(e);
        setError("تعذر تحميل الحجوزات");
      },
    );
  }, [user, date]);

  const login = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("الإيميل أو كلمة السر غير صحيحة");
    }
  };

  const setStatus = async (b: Booking, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", b.id), { status });
      const slotRef = doc(db, "slots", b.date + "_" + b.time);
      if (status === "cancelled") {
        await deleteDoc(slotRef);
      } else if (b.status === "cancelled") {
        await setDoc(slotRef, { date: b.date, time: b.time });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (b: Booking) => {
    if (!confirm("تحذف هذا الحجز؟")) return;
    try {
      await deleteDoc(doc(db, "bookings", b.id));
      await deleteDoc(doc(db, "slots", b.date + "_" + b.time));
    } catch (e) {
      console.error(e);
    }
  };

  if (!ready)
    return (
      <div dir="rtl" className="p-8 text-center">
        ...
      </div>
    );

  if (!user) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-neutral-100 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4">دخول الإدارة 🔐</h1>
          <input
            type="email"
            placeholder="الإيميل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 w-full mb-2"
          />
          <input
            type="password"
            placeholder="كلمة السر"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="border border-neutral-300 rounded-lg px-3 py-2 w-full mb-3"
          />
          {error && <p className="text-red-600 mb-3">{error}</p>}
          <button
            onClick={login}
            className="bg-neutral-900 text-white rounded-lg py-3 w-full font-semibold"
          >
            دخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-neutral-100 p-4 flex justify-center"
    >
      <div className="bg-white rounded-2xl shadow p-6 max-w-2xl w-full h-fit">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">حجوزات الصالون 📋</h1>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-neutral-500 underline"
          >
            خروج
          </button>
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-2 mb-4"
        />

        {error && <p className="text-red-600 mb-3">{error}</p>}

        {bookings.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">
            ما كاين حتى حجز في هذا اليوم
          </p>
        ) : (
          <div className="grid gap-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="border border-neutral-200 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">
                      {b.time} — {b.name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {SERVICE_NAMES[b.service] ?? b.service} ·{" "}
                      <span dir="ltr">{b.phone}</span>
                    </p>
                  </div>
                  <span
                    className={
                      "text-xs rounded-full px-3 py-1 " +
                      (b.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : b.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700")
                    }
                  >
                    {b.status === "confirmed"
                      ? "مؤكد"
                      : b.status === "cancelled"
                        ? "ملغى"
                        : "في الانتظار"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(b, "confirmed")}
                    className="bg-green-600 text-white rounded-lg px-3 py-1 text-sm"
                  >
                    تأكيد
                  </button>
                  <button
                    onClick={() => setStatus(b, "cancelled")}
                    className="bg-neutral-200 rounded-lg px-3 py-1 text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => remove(b)}
                    className="text-red-600 text-sm mr-auto"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
