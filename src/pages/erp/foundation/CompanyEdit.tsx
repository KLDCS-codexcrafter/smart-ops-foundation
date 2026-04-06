import { useParams } from 'react-router-dom';
import CompanyForm from './CompanyForm';
export default function CompanyEdit() {
  const { id } = useParams();
  return <CompanyForm entityType="company" mode="edit" entityId={id} />;
}
