import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { Document, Page, pdfjs } from "react-pdf";
import "pdfjs-dist/build/pdf.worker.entry";

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

function App() {
    const socket = io('https://pdfcoviewer-be.onrender.com', {
        transports: ['websocket'], // Use WebSocket transport
        secure: true,
    });
    const [pdfData, setPdfData] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(5);
    const [isAdmin, setIsAdmin] = useState(true);
    const canvasRef = useRef(null);

    console.log(pdfData);

    useEffect(() => {
        try {
            socket.on('admin', setIsAdmin(true))
            socket.on('load-pdf', async ({ base64, page }) => {
                console.log(base64)
                setPdfData(base64);
                setPageNum(page)
            });

            socket.on('update-page', (page) => {
                if (!isAdmin && pdfData) {
                    setPageNum(page)
                }
            });

            return () => {
                socket.off('load-pdf');
                socket.off('update-page');
            };
        } catch (error) {
            console.log(error);
        }
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const base64 = await fileToBase64(file);
            setIsAdmin(true);
            socket.emit('upload-pdf', { base64 });
            setPdfData(base64)
            setPageNum(0)

        }
    };

    const renderPage = (pdf, num) => {
        setPageNum(num);
        pdf.getPage(num).then((page) => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            page.render({ canvasContext: context, viewport });
        });
    };

    const changePage = (offset) => {
        const newPage = pageNum + offset;
        if (newPage > 0 && newPage <= numPages) {
            setPageNum(newPage);
            if (isAdmin) socket.emit('change-page', newPage);
        }
    };

    return (
        <div className="App">
            <h1>PDF Co Viewer</h1>
            <h2>By Alia</h2>
            {isAdmin && (
                <div className='input-container'>
                    <span className='input-label'>Choose your file</span>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                </div>
            )}
            {isAdmin && (
                <div>
                    <button className='pdf-buttons' onClick={() => changePage(-1)} disabled={pageNum <= 1}>
                        Previous Page
                    </button>
                    <button className='pdf-buttons' onClick={() => changePage(1)} disabled={pageNum >= numPages}>
                        Next Page
                    </button>
                </div>
            )}

            {pdfData && (
                <Document file={`data:application/pdf;base64,${pdfData}`}>
                    <Page pageNumber={pageNum} />
                </Document>
            )}
        </div>
    );
}

export default App;
