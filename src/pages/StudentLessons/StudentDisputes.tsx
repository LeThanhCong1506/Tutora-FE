import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClaimantDisputesPage } from '../../components/disputes';
import type { DisputeListResponse } from '../../services/classSession.service';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';

const StudentDisputes = () => {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const viewSession = useCallback(
    (dispute: DisputeListResponse) => {
      if (dispute.classSessionId) {
        navigate(`/student-portal/calendar/${dispute.classSessionId}`);
      }
    },
    [navigate],
  );

  return (
    <>
      <ClaimantDisputesPage
        key={reloadKey}
        reloadKey={reloadKey}
        onCreate={() => setCreateModalOpen(true)}
        onViewSession={viewSession}
      />

      <CreateDisputeForm
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          setReloadKey((value) => value + 1);
        }}
      />
    </>
  );
};

export default StudentDisputes;
