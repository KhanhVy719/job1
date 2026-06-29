import React, { useEffect, useState, useRef } from 'react';
import Link from "next/link";
import Image from "next/image";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import TextareaAutosize from 'react-textarea-autosize';
interface Episode {
  id: string;
  name: string;
  part: string;
  server: string;
}

const Upload: React.FC = () => {
  const [type, setType] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([
    { id: '1', name: 'Tập 1', part: '', server: '' },
    { id: '2', name: 'Tập 2', part: '', server: '' },
    { id: '3', name: 'Tập 3', part: '', server: '' },
    { id: '4', name: 'Tập 4', part: '', server: '' },
    { id: '5', name: 'Tập 5', part: '', server: '' },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    part: '',
    server: ''
  });

  const handleSelectEpisode = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      const ep = episodes.find(e => e.id === id);
      if (ep) setFormData({ name: ep.name, part: ep.part, server: ep.server });
    } else {
      setFormData({ name: '', part: '', server: '' });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (selectedId) {
      setEpisodes(prev => prev.map(ep =>
        ep.id === selectedId ? { ...ep, [field === 'name' ? 'name' : field === 'part' ? 'part' : 'server']: value } : ep
      ));
    } else {
      if (field === 'name' && value.trim() !== '') {
        const newId = Date.now().toString();
        const newEpisode = {
          id: newId,
          name: value,
          part: newFormData.part,
          server: newFormData.server
        };

        setEpisodes(prev => [...prev, newEpisode]);
        setSelectedId(newId);
      }
    }
  };

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDelete = () => {
    if (selectedId) {
      setEpisodes(prev => prev.filter(ep => ep.id !== selectedId));
      handleSelectEpisode(null);
    }
  };

  const handleDragEnd = () => {
    const draggedIdx = dragItem.current;
    const overIdx = dragOverItem.current;

    if (draggedIdx !== null && overIdx !== null && draggedIdx !== overIdx) {
      const _episodes = [...episodes];
      const draggedItemContent = _episodes[draggedIdx];

      _episodes.splice(draggedIdx, 1);
      _episodes.splice(overIdx, 0, draggedItemContent);

      setEpisodes(_episodes);
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };
  return (
    <>
      <div className='px-3 lg:px-5 xl:px-8 py-5 '>
        <div className='text-xl font-semibold'>Đăng tải Video Short</div>
        <div className='text-base mt-1 text-gray-400'>Upload Video Short từ file hoặc import từ URL</div>

        <div className='grid grid-cols-1 mt-6 lg:grid-cols-10 gap-5 h-full '>
          <div className='lg:col-span-3 '>
            <div className='border border-gay-300 px-5 py-3 rounded-md h-full'>
              <div className='text-lg font-semibold'>Tải video</div>
              <div className='text-sm mt-1 text-gray-400'>Chọn phương thức upload video</div>
              <div className='bg-gray-500/10 rounded-lg mt-4 p-1 flex items-center space-x-2'>
                <button className={`flex items-center w-full text-sm justify-center py-2 font-medium space-x-2 ${type == 0 ? "bg-white text-black" : "text-gray-400"} rounded-lg`} onClick={() => setType(0)} >
                  <i className="fa-regular fa-upload"></i>
                  <span>Upload video</span>
                </button>
                <button className={`flex items-center w-full text-sm justify-center py-2 font-medium space-x-2 ${type == 1 ? "bg-white text-black" : "text-gray-400"} rounded-lg`} onClick={() => setType(1)}>
                  <i className="fa-regular fa-link"></i>
                  <span>Import video</span>
                </button>
              </div>

              <div className='mt-3'>
                {type == 0 ? (<>
                  <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center flex-col '>
                    <i className="fa-regular fa-cloud-arrow-up text-5xl text-gray-500"></i>
                    <button className='text-white mt-3 rounded-lg bg-black px-4 py-2.5 font-medium text-sm'>
                      Chọn file video
                    </button>
                    <p className='mt-2.5 text-[13px] text-gray-400'>
                      MP4 ,MOV,AVI,MKV,WEBM
                    </p>
                  </div>
                </>) : (<>
                  <div className='mt-4'>
                    <input type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='https://domain.com/abc/media/video.mp4' />
                    <button className='text-white w-full mt-3 rounded-lg bg-black px-4 py-2.5 font-medium text-sm'>
                      Chọn
                    </button>
                  </div>
                </>)}
              </div>
            </div>
          </div>
          <div className='lg:col-span-7'>
            <div className='border border-gay-300 px-5 py-3 rounded-md h-full'>
              <div className='text-lg font-semibold'>Cấu hình upload</div>
              <div className='text-sm mt-1 text-gray-400'>Thiếp lập các tùy chọn xử lý video</div>
              <div className='text-[15px] my-5 font-semibold'>Thông tin cơ bản</div>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 '>
                
                <div className='col-span-1'>
                  <label className='font-medium '>Đường dẫn đến phim</label>
                  <div className='mt-2'>
                    <input type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='2025-10-31 07-43-06' />
                  </div>
                </div>
                <div className='col-span-1 '>
                  <label className='font-medium '>Tên Phim</label>
                  <div className='mt-2'>
                    <input type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='2025-10-31 07-43-06' />
                  </div>
                </div>
                <div className='col-span-1 lg:col-span-2'>
                  <label className='font-medium '>Giới thiệu</label>
                  <div className='mt-2'>

                    <TextareaAutosize
                      minRows={6} 
                      className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg resize-none'
                      placeholder="Nhập nội dung..."
                    />
                  </div>
                </div>
                <div className='col-span-1'>
                  <label className='font-medium '>Đường dẫn phim</label>
                  <div className='mt-2'>
                    <input type="text" className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg' placeholder='2025-10-31 07-43-06' />
                  </div>
                </div>
                <div className='col-span-1'>
                  <label className='font-medium '>Server Lưu trữ </label>
                  <div className='mt-2'>
                    <select
                      className='px-3 py-2.5 border-gray-300 outline-0 border w-full rounded-lg'
                    >
                      <option value="">Tiktok</option>
                      <option value="2">Google Drive</option>
                      <option value="3">CloudFlare</option>
                      <option value="4">ASW Cloud</option>
                      <option value="5">Local Cloud</option>
                      <option value="5">Nhúng Iframe</option>
                    </select>
                  </div>
                </div>
              </div>




              <button className='text-white w-full mt-8 rounded-lg bg-black px-4 py-3 font-medium text-sm'>
                Tải lên
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};
export default Upload;