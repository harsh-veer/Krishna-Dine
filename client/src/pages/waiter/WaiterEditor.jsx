import WaiterLayout from '../../layouts/WaiterLayout';
import OrderEditorPage from '../admin/OrderEditorPage';

/** The shared order editor, wrapped in the waiter layout (it switches its links and settings source by role). */
export default function WaiterEditor({ mode }) {
  return (
    <WaiterLayout>
      <OrderEditorPage mode={mode} />
    </WaiterLayout>
  );
}
