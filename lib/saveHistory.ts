import { db } from "./firebase";
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "firebase/firestore";

export async function saveScan(uid: string, data: {
  repo: string; mode: string; totalFiles: number;
  scanned: number; highCount: number; cleanCount: number; score: number;
}) {
  await addDoc(collection(db, "users", uid, "scans"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getHistory(uid: string) {
  const q = query(
    collection(db, "users", uid, "scans"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}