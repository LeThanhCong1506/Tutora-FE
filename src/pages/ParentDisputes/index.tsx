import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClaimantDisputesPage } from '../../components/disputes';
import type { DisputeListResponse } from '../../services/classSession.service';
import CreateDisputeForm from '../ParentLessons/components/CreateDisputeForm';

const ParentDisputes = () => {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const openDispute = useCallback(
    (dispute: DisputeListResponse) => {
      if (dispute.classSessionId) {
        navigate(`/parent-portal/disputes/${dispute.classSessionId}`);
      }
    },
    [navigate],
  );

  return (
    <>
      <ClaimantDisputesPage
        key={reloadKey}
        reloadKey={reloadKey}
        infoText="Theo dõi, tìm kiếm và tạo khiếu nại liên quan đến các buổi học."
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

export default ParentDisputes;
