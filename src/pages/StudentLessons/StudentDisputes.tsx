import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClaimantDisputesPage } from '../../components/disputes';
import type { DisputeListResponse } from '../../services/classSession.service';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';

const StudentDisputes = () => {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const openDispute = useCallback(
    (dispute: DisputeListResponse) => {
      if (dispute.classSessionId) {
        navigate(`/student-portal/disputes/${dispute.classSessionId}`);
      }
    },
    [navigate],
  );

  return (
    <>
      <ClaimantDisputesPage
        key={reloadKey}
        reloadKey={reloadKey}
        infoText="Tạo và theo dõi khiếu nại liên quan đến các buổi học của bạn."
        onCreate={() => setCreateModalOpen(true)}
        onOpenDispute={openDispute}
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
