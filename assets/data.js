import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function initData(app) {
  const db = getFirestore(app);
  const bookingsRef = collection(db, "bookings");

  function mapBooking(snapshot) {
    const data = snapshot.data();
    const toDate = (value) => {
      if (value instanceof Timestamp) {
        return value.toDate();
      }
      return value ? new Date(value) : null;
    };

    return {
      id: snapshot.id,
      name: data.name,
      email: data.email,
      note: data.note || "",
      from: toDate(data.from),
      to: toDate(data.to),
      ownerEmail: data.ownerEmail || null,
      createdAt: toDate(data.createdAt)
    };
  }

  function subscribeToBookings(callback) {
    const bookingsQuery = query(bookingsRef, orderBy("from", "asc"));
    return onSnapshot(bookingsQuery, (snapshot) => {
      const bookings = snapshot.docs.map(mapBooking);
      callback(bookings);
    });
  }

  async function createBooking(booking) {
    const payload = {
      name: booking.name,
      email: booking.email,
      from: Timestamp.fromDate(booking.from),
      to: Timestamp.fromDate(booking.to),
      note: booking.note || "",
      ownerEmail: booking.ownerEmail || booking.email || null,
      createdAt: serverTimestamp()
    };

    return addDoc(bookingsRef, payload);
  }

  async function deleteBooking(id) {
    const bookingDoc = doc(bookingsRef, id);
    await deleteDoc(bookingDoc);
  }

  return {
    subscribeToBookings,
    createBooking,
    deleteBooking
  };
}
