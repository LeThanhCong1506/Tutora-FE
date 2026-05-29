import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStudents } from '../services/student.service';
import type { StudentType } from '../types/student.type';
import { storageAdapter } from '../services/storage.adapter';

interface StudentContextType {
    students: StudentType[];
    selectedStudent: StudentType | null;
    selectStudent: (student: StudentType) => Promise<void>;
    loading: boolean;
    refreshStudents: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType>({
    students: [],
    selectedStudent: null,
    selectStudent: async () => { },
    loading: true,
    refreshStudents: async () => { },
});

export const useStudentContext = () => useContext(StudentContext);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [students, setStudents] = useState<StudentType[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentType | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStudents = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getStudents();
            if (response.content && response.content.length > 0) {
                setStudents(response.content);

                // Restore previously selected student from storage, or pick first
                const savedId = await storageAdapter.get('selectedStudentId');
                const savedStudent = savedId
                    ? response.content.find(s => s.studentId === savedId)
                    : null;
                setSelectedStudent(savedStudent || response.content[0]);
            }
        } catch (error) {
            console.error('❌ StudentContext - Error loading students:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const selectStudent = async (student: StudentType) => {
        setSelectedStudent(student);
        await storageAdapter.set('selectedStudentId', student.studentId);
    };

    return (
        <StudentContext.Provider value={{
            students,
            selectedStudent,
            selectStudent,
            loading,
            refreshStudents: loadStudents,
        }}>
            {children}
        </StudentContext.Provider>
    );
};

export default StudentContext;
