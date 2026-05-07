import bcrypt from 'bcrypt';

const employees = [
  { email: 'sarah@gmail.com',  first_name: 'Sarah',  last_name: 'Benali',   service: 'Civil Status',    position: 'Acte de naissance',       join_date: '2021-03-20' },
  { email: 'jamel@gmail.com',  first_name: 'Jamel',  last_name: 'Ziani',    service: 'Civil Status',    position: 'Certificat de résidence', join_date: '2021-06-10' },
  { email: 'fatima@gmail.com', first_name: 'Fatima', last_name: 'Hamdani',  service: 'Civil Status',    position: 'Fiche de Résidence',      join_date: '2022-01-05' },
  { email: 'maria@gmail.com',  first_name: 'Maria',  last_name: 'Amrani',   service: 'Civil Status',    position: 'Certificat de mariage',   join_date: '2022-07-20' },
  { email: 'karim@gmail.com',  first_name: 'Karim',  last_name: 'Belkacem', service: 'Technical Service', position: 'Autorisation de voirie', join_date: '2023-02-15' },
];

console.log('-- احذف القديمين');
console.log(`DELETE FROM employees WHERE email IN ('sarah@gmail.com','jamel@gmail.com','fatima@gmail.com','maria@gmail.com','karim@gmail.com');`);
console.log('');
console.log('-- أضف الجدد');
console.log('INSERT INTO employees (email, password_hash, first_name, last_name, role, service, position, join_date, status) VALUES');

const lines = [];
for (const emp of employees) {
  const hash = await bcrypt.hash('employee123', 10);
  lines.push(`('${emp.email}', '${hash}', '${emp.first_name}', '${emp.last_name}', 'employee', '${emp.service}', '${emp.position}', '${emp.join_date}', 'active')`);
}

console.log(lines.join(',\n') + ';');
