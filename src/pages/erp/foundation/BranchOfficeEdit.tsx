import { useParams } from 'react-router-dom';
import BranchOfficeForm from './BranchOfficeForm';
export default function BranchOfficeEdit() {
  const { id } = useParams();
  return <BranchOfficeForm mode="edit" entityId={id} />;
}
