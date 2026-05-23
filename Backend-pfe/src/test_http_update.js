async function main() {
  const id = 'f3c0fb3d-d0fb-4051-8a02-837ed8d0ddb0';
  const response = await fetch(`http://localhost:5000/api/admin/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'active' }),
  });
  const data = await response.json();
  console.log('STATUS:', response.status);
  console.log('BODY:', data);
}
main();
