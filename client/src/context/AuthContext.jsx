import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // 👇 FIX: Renamed from isLoading to loading to match App.jsx
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = () => {
            const storedUserStr = localStorage.getItem('mealpass_user');
            const token = localStorage.getItem('mealpass_token');
            
            if (storedUserStr && token) {
                const storedUser = JSON.parse(storedUserStr);
                
                // 🛑 Gatekeeper on Load: Boot them if they are still pending
                if (storedUser.status === 'pending') {
                    localStorage.removeItem('mealpass_token');
                    localStorage.removeItem('mealpass_user');
                    setUser(null);
                } else {
                    setUser(storedUser);
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const userData = response.data.user;

        // 🛑 Gatekeeper on Login: Throw an error BEFORE saving the session
        if (userData.status === 'pending') {
            // Throwing an error here triggers the 'catch' block in your Login.jsx
            throw new Error('Your account is still pending Admin approval.');
        }

        // If they pass the check, save the session and log them in
        localStorage.setItem('mealpass_token', response.data.token);
        localStorage.setItem('mealpass_user', JSON.stringify(userData));
        setUser(userData);
        return response.data;
    };

    const register = async (email, password) => {
        const response = await api.post('/auth/register', { email, password });
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('mealpass_token');
        localStorage.removeItem('mealpass_user');
        setUser(null);
    };

    return (
        // 👇 FIX: Exporting 'loading' instead of 'isLoading'
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};