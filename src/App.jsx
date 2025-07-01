import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from 'firebase/auth';
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import { Users, LogOut, Mail, KeyRound, Plus, ArrowLeft, Calendar, Copy, Check, Trash2, X, Printer, Sun, Star, PartyPopper, UserPlus, BookOpen, Share2 } from 'lucide-react';

// --- Firebase Configuration ---
let firebaseConfig = {};
let configError = null;

try {
    firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
} catch (e) {
    console.error("Failed to parse Firebase config from .env.local:", e);
    configError = "Firebase configuration not found or invalid. Make sure your .env.local is properly set.";
}

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(configError || '');

    useEffect(() => {
        if (configError && !Object.keys(firebaseConfig).length) {
            setIsLoading(false);
            return;
        }
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                setUser(user);
                if (user) {
                    const userDocRef = doc(dbInstance, "users", user.uid);
                    const unsubUser = onSnapshot(userDocRef, (doc) => {
                        if (doc.exists()) {
                            setUserData(doc.data());
                        } else {
                            setUserData({ needsOnboarding: true }); 
                        }
                        setIsLoading(false);
                    });
                    return () => unsubUser();
                } else {
                    setUserData(null);
                    setIsLoading(false);
                }
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase Init Error:", e);
            setError("Failed to initialize Firebase. Check your configuration.");
            setIsLoading(false);
        }
    }, []);

    const handleSignOut = () => {
        if (auth) {
            signOut(auth).catch(error => console.error("Sign out error", error));
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex justify-center items-center">
                <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500"></div>
            </div>
        );
    }
    
    if (error && !user) {
        return (
             <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
                <div className="p-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl max-w-2xl mx-auto border border-white text-center">
                    <h3 className="text-xl font-bold text-red-600 mb-2">Application Error</h3>
                    <p className="text-red-800 bg-red-100 p-3 rounded-md">{error}</p>
                </div>
            </div>
        );
    }

    const needsOnboarding = user && userData && userData.needsOnboarding;

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen font-sans text-gray-900">
            {user ? (
                needsOnboarding ? <OnboardingScreen user={user} db={db} /> : <PlannerScreen user={user} userData={userData} db={db} handleSignOut={handleSignOut} />
            ) : <AuthScreen auth={auth} setError={setError} error={error} />}
        </div>
    );
}

// --- Authentication Screen Component ---
const AuthScreen = ({ auth, setError, error }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setIsProcessing(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let msg = "An unexpected error occurred. Please try again.";
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential': msg = "Invalid email or password."; break;
                case 'auth/email-already-in-use': msg = "An account with this email already exists. Please log in."; break;
                case 'auth/weak-password': msg = "Password is too weak. It should be at least 6 characters long."; break;
                case 'auth/invalid-email': msg = "Please enter a valid email address."; break;
            }
            setError(msg);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setError('');
        setIsProcessing(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            let msg = "Google sign-in failed. Please try again.";
            if (err.code === 'auth/popup-closed-by-user') {
                msg = "Sign-in popup was closed before completion.";
            }
            setError(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800">Welcome!</h1>
                    <p className="text-gray-600 mt-2">{isLogin ? "Sign in to continue" : "Create an account to get started"}</p>
                </div>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center"><p>{error}</p></div>}
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" /></div>
                    <button type="submit" disabled={isProcessing} className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-300 flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed">{isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : (isLogin ? 'Log In' : 'Sign Up')}</button>
                </form>
                <div className="relative flex items-center justify-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span><div className="flex-grow border-t border-gray-300"></div></div>
                <button onClick={handleGoogleSignIn} disabled={isProcessing} className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm disabled:bg-gray-200"><svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 173.5 58.5l-65.2 65.2C337.5 97.2 293.8 80 248 80c-82.8 0-150 67.2-150 150s67.2 150 150 150c94.5 0 135.7-77.6 140.8-112.2H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>Sign in with Google</button>
                <p className="text-center text-sm text-gray-600">{isLogin ? "Don't have an account?" : "Already have an account?"}<button onClick={() => { setIsLogin(!isLogin); setError(''); }} disabled={isProcessing} className="font-semibold text-blue-600 hover:text-blue-800 ml-1 disabled:text-gray-400">{isLogin ? 'Sign up' : 'Log in'}</button></p>
            </div>
        </div>
    );
};

// --- Onboarding Screen Component ---
const OnboardingScreen = ({ user, db }) => {
    const [kidName, setKidName] = useState('');
    const [kids, setKids] = useState([]);

    const handleAddKid = () => {
        if (kidName.trim() && !kids.includes(kidName.trim())) {
            setKids([...kids, kidName.trim()].sort((a, b) => a.localeCompare(b)));
            setKidName('');
        }
    };

    const handleRemoveKid = (nameToRemove) => {
        setKids(kids.filter(name => name !== nameToRemove));
    };

    const handleFinishSetup = async () => {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            kids: kids,
            schedules: []
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800">Welcome to Camp Planner!</h1>
                    <p className="text-gray-600 mt-2">Let's add your kids to get started.</p>
                </div>
                <div className="space-y-2">
                    {kids.map(name => (
                        <div key={name} className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                            <span className="font-medium">{name}</span>
                            <button onClick={() => handleRemoveKid(name)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
                 <div className="flex gap-2">
                    <input type="text" value={kidName} onChange={(e) => setKidName(e.target.value)} placeholder="Kid's Name" className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm" />
                    <button onClick={handleAddKid} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 font-semibold">Add Kid</button>
                </div>
                <button onClick={handleFinishSetup} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg">
                    Finish Setup
                </button>
            </div>
        </div>
    );
};


// --- Main Planner Screen ---
const PlannerScreen = ({ user, userData, db, handleSignOut }) => {
    const [view, setView] = useState('dashboard');
    const [currentScheduleId, setCurrentScheduleId] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !userData || !userData.schedules) {
            setIsLoading(false);
            return;
        }
        
        if (userData.schedules.length > 0) {
            const schedulesQuery = query(collection(db, "schedules"), where("__name__", "in", userData.schedules));
            const unsubscribe = onSnapshot(schedulesQuery, (querySnapshot) => {
                const schedulesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSchedules(schedulesData.sort((a,b) => a.kidName.localeCompare(b.kidName)));
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setSchedules([]);
            setIsLoading(false);
        }
    }, [user, userData, db]);

    const handleViewSchedule = (scheduleId) => {
        setCurrentScheduleId(scheduleId);
        setView('viewSchedule');
    };

    const renderContent = () => {
        switch(view) {
            case 'viewSchedule':
                return <ScheduleDetailView scheduleId={currentScheduleId} db={db} user={user} setView={setView} />;
            default:
                return <Dashboard schedules={schedules} setView={setView} user={user} userData={userData} db={db} handleViewSchedule={handleViewSchedule} />;
        }
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800">Camp Planner 2</h1>
                <div className="flex items-center gap-4">
                    <span className="text-gray-600 text-sm hidden sm:block">{user.email}</span>
                    <button onClick={handleSignOut} className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"><LogOut size={18} />Sign Out</button>
                </div>
            </header>
            <main className="mt-10 max-w-7xl mx-auto">
                {isLoading ? <p>Loading your schedules...</p> : renderContent()}
            </main>
        </div>
    );
};

// --- Dashboard Component ---
const Dashboard = ({ schedules, setView, user, userData, db, handleViewSchedule }) => {

    const handleCreateSchedule = async (kidName) => {
        try {
            const newScheduleId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newScheduleRef = doc(db, "schedules", newScheduleId);

            await setDoc(newScheduleRef, {
                kidName: kidName,
                ownerId: user.uid,
                collaborators: [],
                camps: [],
                allKids: [kidName],
                schedule: {},
                startDate: '2025-06-23',
                weekCount: 8,
            });

            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                schedules: arrayUnion(newScheduleRef.id)
            });
            
            handleViewSchedule(newScheduleRef.id);

        } catch (error) {
            console.error("Error creating schedule:", error);
        }
    };

    const userKids = userData.kids || [];
    const scheduledKids = schedules.map(s => s.kidName);
    const unscheduledKids = userKids.filter(k => !scheduledKids.includes(k));

    return (
        <div>
            <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-white/50">
                <h2 className="text-3xl font-bold mb-4">My Kids' Schedules</h2>
                {schedules.length > 0 ? (
                    <ul className="space-y-4">
                        {schedules.map(schedule => (
                            <li key={schedule.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center shadow-sm">
                                <span className="font-semibold text-lg">{schedule.kidName}'s Summer Schedule</span>
                                <button onClick={() => handleViewSchedule(schedule.id)} className="text-blue-600 hover:underline font-semibold">View & Manage</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-600 py-4">You haven't created any schedules yet.</p>
                )}
                {unscheduledKids.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                        <h3 className="font-semibold text-lg mb-2">Create schedules for:</h3>
                        <div className="flex flex-wrap gap-2">
                            {unscheduledKids.map(kid => (
                                <button key={kid} onClick={() => handleCreateSchedule(kid)} className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition flex items-center gap-2">
                                    <Plus size={16}/> {kid}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Schedule Detail View (The Grid) ---
const ScheduleDetailView = ({ scheduleId, db, user, setView }) => {
    const [scheduleData, setScheduleData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modals state
    const [isKidsModalOpen, setKidsModalOpen] = useState(false);
    const [isCampsModalOpen, setCampsModalOpen] = useState(false);
    const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [currentCell, setCurrentCell] = useState({ campIndex: null, weekIndex: null });
    const [isPrintView, setIsPrintView] = useState(false);
    const [selectedKidForSummary, setSelectedKidForSummary] = useState('');

    useEffect(() => {
        const scheduleDocRef = doc(db, "schedules", scheduleId);
        const unsubscribe = onSnapshot(scheduleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setScheduleData({ id: docSnap.id, ...data });
                if (!selectedKidForSummary && data.allKids && data.allKids.length > 0) {
                    setSelectedKidForSummary(data.allKids[0]);
                }
            } else {
                setView('dashboard');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [scheduleId, db, setView, selectedKidForSummary]);

    const handleUpdateList = async (listName, newList) => {
        const sortedList = newList.sort((a,b) => a.localeCompare(b));
        try {
            await updateDoc(doc(db, "schedules", scheduleId), { [listName]: sortedList });
        } catch (e) {
            console.error(`Error updating ${listName}:`, e);
        }
    };
    
    const handleScheduleChange = async (updatedAttendees) => {
        if (currentCell.campIndex === null || currentCell.weekIndex === null) return;
        const key = `${currentCell.campIndex}-${currentCell.weekIndex}`;
        const newSchedule = { ...scheduleData.schedule, [key]: updatedAttendees };
        try {
            await updateDoc(doc(db, "schedules", scheduleId), { schedule: newSchedule });
            setScheduleModalOpen(false);
        } catch (e) {
            console.error("Error updating schedule:", e);
        }
    };

    if (isLoading || !scheduleData) {
        return <p>Loading schedule details...</p>;
    }
    
    if (isPrintView) {
        return <PrintableSummary planData={scheduleData} selectedKid={selectedKidForSummary} setIsPrintView={setIsPrintView} />;
    }

    return (
        <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-2xl w-full max-w-7xl mx-auto">
             <button onClick={() => setView('dashboard')} className="text-blue-600 hover:text-blue-800 flex items-center mb-6 font-semibold"><ArrowLeft size={18} className="mr-1" />Back to Dashboard</button>
            <h2 className="text-3xl font-bold text-gray-800">{scheduleData.kidName}'s Summer Schedule</h2>
            <p className="text-gray-500 mb-6">Schedule ID: {scheduleData.id}</p>
            
            <ScheduleGrid 
                planData={scheduleData} 
                handleOpenModal={(campIndex, weekIndex) => {
                    setCurrentCell({ campIndex, weekIndex });
                    setScheduleModalOpen(true);
                }}
                setKidsModalOpen={setKidsModalOpen}
                setCampsModalOpen={setCampsModalOpen}
                setSelectedKidForSummary={setSelectedKidForSummary}
                setIsPrintView={setIsPrintView}
            />

            {/* Modals */}
            <ManagementModal isOpen={isKidsModalOpen} onClose={() => setKidsModalOpen(false)} title="Manage Kids" items={scheduleData.allKids || []} onSave={(newList) => handleUpdateList('allKids', newList)} placeholder="Add new kid's name" />
            <ManagementModal isOpen={isCampsModalOpen} onClose={() => setCampsModalOpen(false)} title="Manage Camps" items={scheduleData.camps || []} onSave={(newList) => handleUpdateList('camps', newList)} placeholder="Add new camp name" />
            <EditScheduleModal modal={{isOpen: isScheduleModalOpen, ...currentCell}} planData={scheduleData} handleCloseModal={() => setScheduleModalOpen(false)} handleScheduleChange={handleScheduleChange} />
        </div>
    );
};

// --- Re-integrated components from V1, adapted for V2 ---
const ScheduleGrid = ({ planData, handleOpenModal, setKidsModalOpen, setCampsModalOpen, setSelectedKidForSummary, setIsPrintView }) => {
    const kidColors = useMemo(() => [
        'bg-blue-200 text-blue-800', 'bg-green-200 text-green-800', 'bg-yellow-200 text-yellow-800',
        'bg-purple-200 text-purple-800', 'bg-pink-200 text-pink-800', 'bg-indigo-200 text-indigo-800',
        'bg-red-200 text-red-800', 'bg-teal-200 text-teal-800'
    ], []);
    
    const getKidColor = (kidName) => {
        const sortedKids = [...(planData.allKids || [])].sort((a,b) => a.localeCompare(b));
        const index = sortedKids.indexOf(kidName);
        return kidColors[index % kidColors.length];
    };

    const renderWeekHeader = (weekIndex) => {
        if (!planData.startDate) return `Week ${weekIndex + 1}`;
        try {
            const parts = planData.startDate.split('-');
            const baseDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            const weekStartDate = new Date(baseDate);
            weekStartDate.setUTCDate(baseDate.getUTCDate() + weekIndex * 7);
            const monthName = weekStartDate.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
            const dateNum = weekStartDate.getUTCDate();
            return (
                <div className="text-center">
                    <div className="font-semibold text-gray-700">Week {weekIndex + 1}</div>
                    <div className="text-xs text-gray-500 font-normal">{monthName} {dateNum}</div>
                </div>
            );
        } catch (e) {
            console.error("Date parsing error:", e);
            return `Week ${weekIndex + 1}`;
        }
    };

    return (
        <>
            <div className="flex flex-wrap gap-3 my-6 border-t border-gray-200 pt-4">
                <button onClick={() => setKidsModalOpen(true)} className="bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 transition flex items-center gap-2 shadow-sm"><Users size={16}/>Manage Kids</button>
                <button onClick={() => setCampsModalOpen(true)} className="bg-orange-100 text-orange-700 font-semibold py-2 px-4 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 shadow-sm"><Calendar size={16}/>Manage Camps</button>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg mb-6 border">
                <h3 className="font-bold text-lg text-gray-700 mb-2">Printable Summary</h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select onChange={e => setSelectedKidForSummary(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full sm:w-auto shadow-sm">
                        <option value="">-- Select a Kid --</option>
                        {[...(planData.allKids || [])].sort((a,b) => a.localeCompare(b)).map(kid => <option key={kid} value={kid}>{kid}</option>)}
                    </select>
                    <button onClick={() => setIsPrintView(true)} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm">
                        <Printer size={16}/> View Summary
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-gray-100 p-3 text-sm font-semibold text-gray-800 text-left border-b-2 border-gray-300 z-10 rounded-tl-lg">Camp</th>
                            {Array.from({ length: planData.weekCount }, (_, i) => (
                                <th key={i} className="p-3 text-sm border-b-2 border-gray-300">{renderWeekHeader(i)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(planData.camps || []).map((camp, campIndex) => (
                            <tr key={campIndex} className="even:bg-gray-50/70">
                                <td className="sticky left-0 bg-white even:bg-gray-50/70 p-3 font-bold text-gray-800 border-b border-gray-200 z-10 shadow-sm">{camp}</td>
                                {Array.from({ length: planData.weekCount }, (_, weekIndex) => {
                                    const key = `${campIndex}-${weekIndex}`;
                                    const attendees = planData.schedule[key] || [];
                                    return (
                                        <td key={weekIndex} onClick={() => handleOpenModal(campIndex, weekIndex)} className="p-2 border-b border-gray-200 text-center cursor-pointer hover:bg-blue-100/50 transition min-w-[140px]">
                                            <div className="flex flex-wrap justify-center items-center gap-1 min-h-[48px]">
                                                {attendees.map(kid => <span key={kid} className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${getKidColor(kid)}`}>{kid}</span>)}
                                                {attendees.length === 0 && <Plus size={16} className="text-gray-400" />}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const PrintableSummary = ({ planData, selectedKid, setIsPrintView }) => {
    const renderWeekHeader = (weekIndex) => {
        if (!planData.startDate) return `Week ${weekIndex + 1}`;
        try {
            const parts = planData.startDate.split('-');
            const baseDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            const weekStartDate = new Date(baseDate);
            weekStartDate.setUTCDate(baseDate.getUTCDate() + weekIndex * 7);
            const monthName = weekStartDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
            const dateNum = weekStartDate.getUTCDate();
            return `Week of ${monthName} ${dateNum}`;
        } catch (e) {
            return `Week ${weekIndex + 1}`;
        }
    };

    return (
        <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto printable-area">
            <div className="no-print flex justify-between items-center mb-8">
                <button onClick={() => setIsPrintView(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition flex items-center gap-2">
                    <ArrowLeft size={18} /> Back to Grid
                </button>
                <button onClick={() => window.print()} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                    <Printer size={18} /> Print
                </button>
            </div>
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-blue-600 flex items-center justify-center gap-3"><PartyPopper size={40}/>{selectedKid}'s Summer Camp Plan!</h1>
            </div>
            <div className="space-y-6">
                {Array.from({ length: planData.weekCount }, (_, weekIndex) => {
                    let kidCamp = "No camp this week!";
                    let friends = [];
                    for (let campIndex = 0; campIndex < planData.camps.length; campIndex++) {
                        const key = `${campIndex}-${weekIndex}`;
                        const attendees = planData.schedule[key] || [];
                        if (attendees.includes(selectedKid)) {
                            kidCamp = planData.camps[campIndex];
                            friends = attendees.filter(name => name !== selectedKid);
                            break;
                        }
                    }

                    return (
                        <div key={weekIndex} className="p-5 rounded-xl" style={{backgroundColor: weekIndex % 2 === 0 ? '#f0f9ff' : '#fefce8'}}>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Sun className="text-yellow-500" /> {renderWeekHeader(weekIndex)}</h2>
                            <div className="mt-4 pl-10">
                                <p className="text-xl"><strong className="font-semibold text-gray-700">Camp:</strong> {kidCamp}</p>
                                {friends.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xl flex items-center gap-2"><Star className="text-green-500" /> <strong className="font-semibold text-gray-700">Friends you'll see:</strong></p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {friends.map(friend => <span key={friend} className="bg-green-200 text-green-800 font-medium px-3 py-1 rounded-full">{friend}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EditScheduleModal = ({ modal, planData, handleCloseModal, handleScheduleChange }) => {
    if (!modal.isOpen || !planData) return null;
    const allKids = [...(planData.allKids || [])].sort((a,b) => a.localeCompare(b));
    const key = `${modal.campIndex}-${modal.weekIndex}`;
    const currentAttendees = planData.schedule[key] || [];
    const [selectedKids, setSelectedKids] = useState(new Set(currentAttendees));
    const handleCheckboxChange = (kidName) => setSelectedKids(prev => { const newSet = new Set(prev); if (newSet.has(kidName)) newSet.delete(kidName); else newSet.add(kidName); return newSet; });
    const handleSave = () => handleScheduleChange(Array.from(selectedKids));
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100">
                <h3 className="text-xl font-bold mb-1">Edit Attendees</h3>
                <p className="text-gray-600 mb-4">For <span className="font-semibold">{planData.camps[modal.campIndex]}</span>, Week <span className="font-semibold">{modal.weekIndex + 1}</span></p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {allKids.map(kid => (
                        <label key={kid} className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedKids.has(kid)} onChange={() => handleCheckboxChange(kid)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-gray-800 font-medium">{kid}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold">Save</button>
                </div>
            </div>
        </div>
    );
};

const ManagementModal = ({ isOpen, onClose, title, items, onSave, placeholder }) => {
    if (!isOpen) return null;

    const [currentItems, setCurrentItems] = useState([]);
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCurrentItems([...items].sort((a, b) => a.localeCompare(b)));
        }
    }, [isOpen, items]);

    const handleAddItem = () => {
        if (newItem.trim() && !currentItems.includes(newItem.trim())) {
            setCurrentItems(prevItems => [...prevItems, newItem.trim()].sort((a, b) => a.localeCompare(b)));
            setNewItem('');
        }
    };

    const handleRemoveItem = (itemToRemove) => {
        setCurrentItems(currentItems.filter(item => item !== itemToRemove));
    };

    const handleSave = () => {
        onSave(currentItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                    {currentItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
                            <span className="text-gray-800 font-medium">{item}</span>
                            <button onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mb-6">
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={placeholder} className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm" />
                    <button onClick={handleAddItem} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 font-semibold">Add</button>
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, planName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold text-gray-800">Confirm Deletion</h3>
                <p className="text-gray-600 my-4">Are you sure you want to delete the plan: <strong className="font-semibold">{planName}</strong>? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold">Delete Plan</button>
                </div>
            </div>
        </div>
    );
};
