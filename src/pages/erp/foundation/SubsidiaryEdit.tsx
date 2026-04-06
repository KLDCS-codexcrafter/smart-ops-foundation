import { useParams } from 'react-router-dom';
import CompanyForm from './CompanyForm';
export default function SubsidiaryEdit() {
  const { id } = useParams();
  return <CompanyForm entityType="subsidiary" mode="edit" entityId={id} />;
}
