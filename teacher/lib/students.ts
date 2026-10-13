import { Student } from '@/types'

const FIRST_NAMES = [
  'Aarav','Aditi','Akash','Amit','Ananya','Anika','Arjun','Aryan',
  'Deepa','Divya','Gaurav','Ishaan','Kabir','Kavya','Kunal','Mansi',
  'Mihir','Neha','Nikhil','Prajwal','Priya','Rahul','Riya','Rohan',
  'Sahil','Sakshi','Sanjay','Shreya','Simran','Sneha','Suresh','Tanvi',
  'Tushar','Varun','Vedant','Vidya','Vikram','Vishal','Yash','Zara'
]

const LAST_NAMES = [
  'Bhosale','Chavan','Deshmukh','Deshpande','Gaikwad','Jadhav',
  'Joshi','Kadam','Kulkarni','Lokhande','Mali','Mane','More',
  'Naik','Patil','Pawar','Salunkhe','Sawant','Shah','Sharma',
  'Shinde','Singh','Suryavanshi','Thorat','Wagh'
]

const AREAS = [
  'Kothrud','Baner','Wakad','Aundh','Hadapsar',
  'Shivajinagar','Viman Nagar','Pimpri','Chinchwad','Magarpatta'
]

const PANELS = ['A','B','C','D','E','F','G','H','I','J','K']

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function generateStudents(): Student[] {
  const rand = seededRand(42)
  const students: Student[] = []

  PANELS.forEach(panel => {
    for (let i = 0; i < 60; i++) {
      const fi = Math.floor(rand() * FIRST_NAMES.length)
      const li = Math.floor(rand() * LAST_NAMES.length)
      const firstName = FIRST_NAMES[fi]
      const lastName = LAST_NAMES[li]
      const num = String(i + 1).padStart(3, '0')
      const roll_no = `TY-CSE-${panel}-${num}`
      const emailSuffix = String(Math.floor(rand() * 90) + 10)
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@mitwpu.edu.in`
      const phonePrefix = Math.floor(rand() * 30) + 70
      const phoneRest = String(Math.floor(rand() * 1e8)).padStart(8, '0')
      const phone = `${phonePrefix}${phoneRest}`
      const area = AREAS[Math.floor(rand() * AREAS.length)]
      const houseNo = Math.floor(rand() * 999) + 1
      const address = `${houseNo}, ${area}, Pune, Maharashtra`
      const aadharRaw = String(Math.floor(rand() * 1e12)).padStart(12, '0')
      const aadhar = `${aadharRaw.slice(0,4)} ${aadharRaw.slice(4,8)} ${aadharRaw.slice(8,12)}`
      const year = 2002 + Math.floor(rand() * 3)
      const month = String(Math.floor(rand() * 12) + 1).padStart(2, '0')
      const day = String(Math.floor(rand() * 28) + 1).padStart(2, '0')
      const dob = `${day}/${month}/${year}`
      const gender: 'Male' | 'Female' = (students.length % 2 === 0) ? 'Male' : 'Female'

      students.push({
        roll_no,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        address,
        aadhar,
        dob,
        gender,
        department: 'CSE',
        panel,
        year: 'TY',
        program: 'BTech'
      })
    }
  })

  return students
}

export const STUDENTS: Student[] = generateStudents()
